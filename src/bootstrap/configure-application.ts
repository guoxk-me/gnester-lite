import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import type { RateLimitConfig } from '../config/application-config.types.js';
import { Environment } from '../config/config-enums.js';
import { createCorsOptions } from './http/cors.config.js';
import { CsrfService } from '../infra/csrf/csrf.service.js';
import { createHelmetOptions } from './http/helmet-options.js';
import { setupOpenApi } from './http/openapi.config.js';
import { SocketIoAdapter } from './http/socket-io.adapter.js';
import { createValidationPipe } from './http/validation.pipe.js';

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
  const rateLimitConfig =
    configService.getOrThrow<RateLimitConfig>('rateLimit');
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

  // AI modified: database-backed application sessions replace the removed Demo MemoryStore.
  const csrfService = app.get(CsrfService);
  // AI modified: Nest controllers now own authentication, so body parsing precedes CSRF validation.
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });

  app.use(csrfService.createProtectionMiddleware());
  app.use(csrfService.createErrorHandler());

  // AI modified: the custom exception factory owns one stable sanitized contract in every environment.
  app.useGlobalPipes(createValidationPipe());
  // AI modified: keep the landing route public while grouping every API route under the configured prefix.
  app.setGlobalPrefix(
    configService.getOrThrow<string>('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });
  await setupOpenApi(app, nodeEnv);

  return port;
}
