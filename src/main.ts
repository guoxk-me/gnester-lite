import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';

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
