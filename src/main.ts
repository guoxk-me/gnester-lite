import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as NestLogger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { Environment, RateLimitConfig } from 'config/config.types';
import { setupAsyncApi } from './common/asyncapi/asyncapi.config';
import { createCorsOptions } from './common/cors/cors.config';
import { CsrfService } from './common/csrf/csrf.service';
import { setupOpenApi } from './common/openapi/openapi.config';
import { createHelmetOptions } from './common/security/helmet-options';
import { createValidationPipe } from './common/validation/validation.pipe';
import { DemoSocketIoAdapter } from './common/websocket/demo-socket-io.adapter';
import { AppModule } from './app.module';

// AI modified: bootstrap starts with Nest Logger, then switches to nestjs-pino.
let logger: NestLogger | Logger = new NestLogger('Bootstrap');

// CN: 应用启动层，集中挂载跨请求基础设施；EN: Bootstrap layer applies cross-request infrastructure.
async function bootstrap(): Promise<void> {
  // AI modified: buffer startup logs until nestjs-pino Logger is attached.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  logger = app.get(Logger);
  app.useLogger(logger);

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
  const sessionEnabled = configService.get<boolean>('SESSION_ENABLED', true);
  const rateLimitConfig =
    configService.getOrThrow<RateLimitConfig>('rateLimit');
  const isProduction = nodeEnv === Environment.Production;
  const corsOptions = createCorsOptions(configService, nodeEnv);

  app.useWebSocketAdapter(new DemoSocketIoAdapter(app));
  app.set('trust proxy', rateLimitConfig.trustProxy);
  // AI modified: mount Helmet directly so bootstrap middleware uses one registration style.
  app.use(helmet(createHelmetOptions(nodeEnv)));

  if (corsOptions) {
    app.enableCors(corsOptions);
  }

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

  if (sessionEnabled) {
    if (isProduction) {
      throw new Error(
        'SESSION_ENABLED=true uses the demo MemoryStore. Configure a production session store before enabling sessions in production.',
      );
    }

    const sessionSecret =
      configService.get<string>('SESSION_SECRET') ||
      'gnester-lite-local-session-secret';

    app.use(
      session({
        name: configService.get<string>('SESSION_COOKIE_NAME', 'gnester.sid'),
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: configService.get<boolean>('SESSION_COOKIE_SECURE', false),
          sameSite: configService.get<'lax' | 'strict' | 'none'>(
            'SESSION_COOKIE_SAME_SITE',
            'lax',
          ),
          maxAge: configService.get<number>(
            'SESSION_COOKIE_MAX_AGE',
            86_400_000,
          ),
        },
      }),
    );
  }

  const csrfService = app.get(CsrfService);
  app.use(csrfService.createProtectionMiddleware());
  app.use(csrfService.createErrorHandler());

  app.useGlobalPipes(createValidationPipe(nodeEnv));
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  setupOpenApi(app, nodeEnv);
  setupAsyncApi(app, nodeEnv, port);

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
