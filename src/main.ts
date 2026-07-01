import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { Environment } from 'config/config.types';
import { createValidationPipe } from './common/validation/validation.pipe';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<Environment>(
    'NODE_ENV',
    Environment.Development,
  );
  const cookieSecret = configService.get<string>('COOKIE_SECRET') || undefined;
  const compressionEnabled = configService.get<boolean>(
    'COMPRESSION_ENABLED',
    true,
  );
  const compressionThreshold = configService.get<string>(
    'COMPRESSION_THRESHOLD',
    '1kb',
  );
  const compressionLevel = configService.get<number>('COMPRESSION_LEVEL', 6);

  if (compressionEnabled) {
    app.use(
      compression({
        threshold: compressionThreshold,
        level: compressionLevel,
        filter: (req, res) => {
          if (req.headers.accept?.includes('text/event-stream')) {
            return false;
          }

          return compression.filter(req, res);
        },
      }),
    );
  }
  app.use(cookieParser(cookieSecret));
  app.useGlobalPipes(createValidationPipe(nodeEnv));
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap().catch((err) => {
  logger.error('Error during application bootstrap', err);
});
