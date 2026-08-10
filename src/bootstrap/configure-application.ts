import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import { I18nService } from 'nestjs-i18n';

import { Environment, type RateLimitConfig } from 'config/config.types';
import { BetterAuthService } from '../platform/security/better-auth/better-auth.service';
import { createBetterAuthRequestMiddleware } from './http/better-auth.middleware';
import { createCorsOptions } from './http/cors.config';
import { CsrfService } from '../platform/security/csrf/csrf.service';
import { createHelmetOptions } from './http/helmet-options';
import { setupOpenApi } from './http/openapi.config';
import { SocketIoAdapter } from './http/socket-io.adapter';
import { createValidationPipe } from './http/validation.pipe';

// AI modified: centralize the order-sensitive bootstrap pipeline so runtime and tests can share one entry point.
export async function configureApplication(
  app: NestExpressApplication,
): Promise<number> {
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<Environment>(
    'NODE_ENV',
    Environment.Development,
  );
  const cookieSecret = configService.get<string>('COOKIE_SECRET') || undefined;
  const isCompressionEnabled = configService.get<boolean>(
    'COMPRESSION_ENABLED',
    true,
  );
  const compressionThreshold = configService.get<string>(
    'COMPRESSION_THRESHOLD',
    '1kb',
  );
  const compressionLevel = configService.get<number>('COMPRESSION_LEVEL', 6);
  const isSessionEnabled = configService.get<boolean>('SESSION_ENABLED', true);
  const rateLimitConfig =
    configService.getOrThrow<RateLimitConfig>('rateLimit');
  const isProduction = nodeEnv === Environment.Production;
  const corsOptions = createCorsOptions(configService, nodeEnv);

  // AI modified: HTTP and Socket.IO now share the same validated origin policy.
  app.useWebSocketAdapter(new SocketIoAdapter(app, corsOptions));
  app.set('trust proxy', rateLimitConfig.trustProxy);
  app.use(helmet(createHelmetOptions(nodeEnv)));

  if (corsOptions) {
    app.enableCors(corsOptions);
  }

  if (isCompressionEnabled) {
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

  if (isSessionEnabled) {
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

  const betterAuthHandler = await app
    .get(BetterAuthService)
    .getRequestHandler();
  const i18nService = app.get(I18nService);

  // AI modified: mount the raw Better Auth handler before restoring Nest body parsers.
  app.use(createBetterAuthRequestMiddleware(betterAuthHandler, i18nService));
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });

  const csrfService = app.get(CsrfService);
  app.use(csrfService.createProtectionMiddleware());
  app.use(csrfService.createErrorHandler());

  // AI modified: the custom exception factory owns one stable sanitized contract in every environment.
  app.useGlobalPipes(createValidationPipe());
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  await setupOpenApi(app, nodeEnv);

  return port;
}
