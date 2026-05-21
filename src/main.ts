import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { Environment } from 'config/config.types';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<Environment>(
    'NODE_ENV',
    Environment.Development,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: nodeEnv === Environment.Production,
      whitelist: true,
      forbidNonWhitelisted: true,
      // Automatically transform payloads to DTO class instances. 自动将请求载荷转换为 DTO 类实例。
      transform: true,
    }),
  );
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
