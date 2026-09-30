import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { I18nService } from 'nestjs-i18n';

import { Environment } from '../config/config-enums.js';
import { type RateLimitConfig } from '../config/application-config.types.js';
import { BetterAuthService } from '../better-auth/better-auth.service.js';
import { CsrfService } from '../csrf/csrf.service.js';
import { createHelmetOptions } from './http/helmet-options.js';
import { setupOpenApi } from './http/openapi.config.js';
import { SocketIoAdapter } from './http/socket-io.adapter.js';
import { configureApplication } from './configure-application.js';

vi.mock('compression', () => ({
  __esModule: true,
  default: Object.assign(
    vi.fn(() => vi.fn()),
    {
      filter: vi.fn(),
    },
  ),
}));
vi.mock('cookie-parser', () => ({
  __esModule: true,
  default: vi.fn(() => vi.fn()),
}));
vi.mock('express-session', () => ({
  __esModule: true,
  default: vi.fn(() => vi.fn()),
}));
vi.mock('helmet', () => ({
  __esModule: true,
  default: vi.fn(() => vi.fn()),
}));
vi.mock('./http/openapi.config', () => ({
  setupOpenApi: vi.fn(),
}));

describe('configureApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the complete order-sensitive application pipeline', async () => {
    const csrfProtection = vi.fn() as RequestHandler;
    const csrfErrorHandler = vi.fn() as ErrorRequestHandler;
    const csrfService = {
      createProtectionMiddleware: vi.fn(() => csrfProtection),
      createErrorHandler: vi.fn(() => csrfErrorHandler),
    };
    const betterAuthHandler = vi.fn().mockResolvedValue(undefined);
    const betterAuthService = {
      getRequestHandler: vi.fn().mockResolvedValue(betterAuthHandler),
    };
    const i18nService = {
      translate: vi.fn(),
    };
    const values = new Map<string, unknown>([
      ['PORT', 4100],
      ['NODE_ENV', Environment.Development],
      ['app.apiPrefix', 'api'],
      ['COMPRESSION_ENABLED', true],
      ['SESSION_ENABLED', true],
      ['SESSION_SECRET', 'test-session-secret'],
      ['COOKIE_SECRET', 'test-cookie-secret'],
      ['CORS_ENABLED', true],
      ['CORS_CREDENTIALS', true],
      [
        'rateLimit',
        {
          trustProxy: 'loopback',
        } satisfies Partial<RateLimitConfig>,
      ],
    ]);
    const configService = {
      get: vi.fn((key: string, fallback?: unknown) =>
        values.has(key) ? values.get(key) : fallback,
      ),
      getOrThrow: vi.fn((key: string) => {
        if (!values.has(key)) {
          throw new Error(`Missing test config: ${key}`);
        }

        return values.get(key);
      }),
    };
    const enableCors = vi.fn();
    const enableVersioning = vi.fn();
    const setGlobalPrefix = vi.fn();
    const set = vi.fn();
    const use = vi.fn();
    const useBodyParser = vi.fn();
    const useGlobalPipes = vi.fn();
    const useWebSocketAdapter = vi.fn();
    const app = {
      enableCors,
      enableVersioning,
      get: vi.fn((token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }

        if (token === CsrfService) {
          return csrfService;
        }

        if (token === BetterAuthService) {
          return betterAuthService;
        }

        if (token === I18nService) {
          return i18nService;
        }

        throw new Error('Unexpected provider lookup');
      }),
      set,
      setGlobalPrefix,
      use,
      useBodyParser,
      useGlobalPipes,
      useWebSocketAdapter,
    } as unknown as NestExpressApplication;

    const port = await configureApplication(app);
    const helmetMiddleware = vi.mocked(helmet).mock.results[0]
      ?.value as unknown as RequestHandler;
    const compressionMiddleware = vi.mocked(compression).mock.results[0]
      ?.value as unknown as RequestHandler;
    const cookieMiddleware = vi.mocked(cookieParser).mock.results[0]
      ?.value as unknown as RequestHandler;
    const sessionMiddleware = vi.mocked(session).mock.results[0]
      ?.value as unknown as RequestHandler;

    expect(port).toBe(4100);
    expect(set).toHaveBeenCalledWith('trust proxy', 'loopback');
    expect(helmet).toHaveBeenCalledWith(
      createHelmetOptions(Environment.Development),
    );
    expect(enableCors).toHaveBeenCalledWith({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      maxAge: 600,
      optionsSuccessStatus: 204,
    });
    expect(compression).toHaveBeenCalledWith({
      threshold: '1kb',
      level: 6,
      filter: expect.any(Function) as RequestHandler,
    });
    expect(cookieParser).toHaveBeenCalledWith('test-cookie-secret');
    expect(session).toHaveBeenCalledWith({
      name: 'gnester.sid',
      secret: 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 86_400_000,
      },
    });
    expect(useWebSocketAdapter).toHaveBeenCalledWith(
      expect.any(SocketIoAdapter),
    );
    expect(use.mock.calls).toEqual([
      [helmetMiddleware],
      [compressionMiddleware],
      [cookieMiddleware],
      [sessionMiddleware],
      [expect.any(Function)],
      [csrfProtection],
      [csrfErrorHandler],
    ]);
    expect(betterAuthService.getRequestHandler).toHaveBeenCalledTimes(1);
    expect(useBodyParser.mock.calls).toEqual([
      ['json'],
      ['urlencoded', { extended: true }],
    ]);
    expect(useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(setGlobalPrefix).toHaveBeenCalledWith('api', {
      exclude: ['/'],
    });
    expect(enableVersioning).toHaveBeenCalledWith({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });
    expect(setupOpenApi).toHaveBeenCalledWith(app, Environment.Development);

    const invocationOrder = [
      useWebSocketAdapter.mock.invocationCallOrder[0],
      set.mock.invocationCallOrder[0],
      vi.mocked(helmet).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[0],
      enableCors.mock.invocationCallOrder[0],
      vi.mocked(compression).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[1],
      vi.mocked(cookieParser).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[2],
      vi.mocked(session).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[3],
      use.mock.invocationCallOrder[4],
      useBodyParser.mock.invocationCallOrder[0],
      useBodyParser.mock.invocationCallOrder[1],
      use.mock.invocationCallOrder[5],
      use.mock.invocationCallOrder[6],
      useGlobalPipes.mock.invocationCallOrder[0],
      setGlobalPrefix.mock.invocationCallOrder[0],
      enableVersioning.mock.invocationCallOrder[0],
      vi.mocked(setupOpenApi).mock.invocationCallOrder[0],
    ];

    expect(invocationOrder).toEqual(
      [...invocationOrder].sort((left, right) => left - right),
    );
  });

  it('rejects the demo MemoryStore when sessions are enabled in production', async () => {
    const values = new Map<string, unknown>([
      ['NODE_ENV', Environment.Production],
      ['SESSION_ENABLED', true],
      ['COMPRESSION_ENABLED', false],
      ['CORS_ENABLED', true],
      ['CORS_ORIGINS', 'https://example.com'],
      [
        'rateLimit',
        {
          trustProxy: 'loopback',
        } satisfies Partial<RateLimitConfig>,
      ],
    ]);
    const configService = {
      get: vi.fn((key: string, fallback?: unknown) =>
        values.has(key) ? values.get(key) : fallback,
      ),
      getOrThrow: vi.fn((key: string) => {
        if (!values.has(key)) {
          throw new Error(`Missing test config: ${key}`);
        }

        return values.get(key);
      }),
    };
    const app = {
      enableCors: vi.fn(),
      get: vi.fn((token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }

        throw new Error('Unexpected provider lookup');
      }),
      set: vi.fn(),
      use: vi.fn(),
      useWebSocketAdapter: vi.fn(),
    } as unknown as NestExpressApplication;

    await expect(configureApplication(app)).rejects.toThrow(
      'SESSION_ENABLED=true uses the demo MemoryStore',
    );
    expect(session).not.toHaveBeenCalled();
  });
});
