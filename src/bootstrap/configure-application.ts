import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';

import { Environment, type RateLimitConfig } from 'config/config.types';
import { setupAsyncApi } from '../common/asyncapi/asyncapi.config';
import { createCorsOptions } from '../common/cors/cors.config';
import { CsrfService } from '../common/csrf/csrf.service';
import { setupOpenApi } from '../common/openapi/openapi.config';
import { createHelmetOptions } from '../common/security/helmet-options';
import { createValidationPipe } from '../common/validation/validation.pipe';
import { DemoSocketIoAdapter } from '../common/websocket/demo-socket-io.adapter';

// AI modified: centralize the order-sensitive bootstrap pipeline so runtime and tests can share one entry point.
export function configureApplication(app: NestExpressApplication): number {
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
  app.use(helmet(createHelmetOptions(nodeEnv)));

  if (corsOptions) {
    app.enableCors(corsOptions);
  }

  if (compressionEnabled) {
    app.use(
      compression({
        threshold: compressionThreshold,
        level: compressionLevel,
        filter: (request, response) => {
          if (request.headers.accept?.includes('text/event-stream')) {
            return false;
          }

          return compression.filter(request, response);
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

  return port;
}
