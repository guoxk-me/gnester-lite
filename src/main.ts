// AI modified: import Sentry instrumentation before any Nest or app modules.
import './instrument';

import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';

// AI modified: bootstrap starts with Nest Logger, then switches to nestjs-pino.
let logger: NestLogger | Logger = new NestLogger('Bootstrap');

// AI modified: keep the process entry point focused on create, configure, and listen.
async function bootstrap(): Promise<void> {
  // AI modified: buffer startup logs until nestjs-pino Logger is attached.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  logger = app.get(Logger);
  app.useLogger(logger);

  const port = configureApplication(app);
  await app.listen(port);
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
bootstrap().catch((err) => {
  logger.error(
    'Error during application bootstrap',
    err instanceof Error ? err.stack : String(err),
    'Bootstrap',
  );
});
