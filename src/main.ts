import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import { Environment, RateLimitConfig } from 'config/config.types';
import { createCorsOptions } from './common/cors/cors.config';
import { createValidationPipe } from './common/validation/validation.pipe';
import { AppModule } from './app.module';
import { CsrfService } from './common/csrf/csrf.service';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
  const rateLimitConfig =
    configService.getOrThrow<RateLimitConfig>('rateLimit');
  const corsOptions = createCorsOptions(configService, nodeEnv);

  app.set('trust proxy', rateLimitConfig.trustProxy);

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

  const sessionEnabled = configService.get<boolean>('SESSION_ENABLED', true);

  if (sessionEnabled) {
    if (nodeEnv === Environment.Production) {
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

  app.useGlobalPipes(createValidationPipe(nodeEnv));
  const csrfService = app.get(CsrfService);
  app.use(csrfService.createProtectionMiddleware());
  app.use(csrfService.createErrorHandler());
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
