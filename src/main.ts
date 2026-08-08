// AI modified: import Sentry instrumentation before any Nest or app modules.
import './instrument';

import { Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import type { ShutdownConfig } from 'config/config.types';
import { AppModule } from './app.module';
import {
  DEFAULT_APPLICATION_SHUTDOWN_BUDGETS,
  registerApplicationShutdownHandlers,
  reportStartupFailureAndShutdown,
  stopAcceptingHttpRequests,
} from './bootstrap/application-shutdown';
import { configureApplication } from './bootstrap/configure-application';
import { ApplicationReadinessService } from './platform/operations/health/application-readiness.service';
import { closeSentryTelemetry } from './platform/observability/sentry/sentry-shutdown';

// AI modified: bootstrap starts with Nest Logger, then switches to nestjs-pino.
let logger: NestLogger | Logger = new NestLogger('Bootstrap');
let app: NestExpressApplication | undefined;

const applicationShutdown = registerApplicationShutdownHandlers({
  getApplication: () => app,
  getBudgets: () =>
    app
      ? app.get(ConfigService).getOrThrow<ShutdownConfig>('shutdown')
      : DEFAULT_APPLICATION_SHUTDOWN_BUDGETS,
  isAcceptingRequests: () => Boolean(app?.getHttpServer()?.listening),
  beginDrain: (reason) => {
    app?.get(ApplicationReadinessService).startDraining();
    logger.log(`Application is draining during ${reason}`, 'Bootstrap');
  },
  stopAcceptingRequests: () => {
    if (!app) {
      return Promise.resolve();
    }

    return stopAcceptingHttpRequests(app.getHttpServer());
  },
  closeTelemetry: closeSentryTelemetry,
  onShutdownError: (shutdownError, reason, phase) => {
    logger.error(
      `Error during the ${phase} shutdown phase for ${reason}`,
      shutdownError instanceof Error
        ? shutdownError.stack
        : String(shutdownError),
      'Bootstrap',
    );
  },
  onShutdownTimeout: (reason, phase) => {
    logger.error(
      `The ${phase} shutdown phase exceeded its deadline during ${reason}`,
      undefined,
      'Bootstrap',
    );
  },
  processTarget: process,
});

// AI modified: retain the app so startup failures and process signals share Nest's cleanup lifecycle.
async function bootstrap(): Promise<void> {
  // AI modified: buffer startup logs until nestjs-pino Logger is attached.
  app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // AI modified: let bootstrap own cleanup and exit reporting instead of Nest aborting the process.
    abortOnError: false,
    // AI modified: Better Auth consumes its raw body and restores parsers only for non-auth routes.
    bodyParser: false,
    bufferLogs: true,
  });
  logger = app.get(Logger);
  app.useLogger(logger);

  const port = await configureApplication(app);
  await app.listen(port);
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
bootstrap().catch(async (err) => {
  await reportStartupFailureAndShutdown(
    () => {
      logger.error(
        'Error during application bootstrap',
        err instanceof Error ? err.stack : String(err),
        'Bootstrap',
      );
    },
    () => applicationShutdown.shutdownApplication(1, 'failed bootstrap'),
  );
});
