import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import session from 'express-session';
import helmet from 'helmet';

import { Environment, type RateLimitConfig } from 'config/config.types';
import { setupAsyncApi } from '../common/asyncapi/asyncapi.config';
import { CsrfService } from '../common/csrf/csrf.service';
import { setupOpenApi } from '../common/openapi/openapi.config';
import { createHelmetOptions } from '../common/security/helmet-options';
import { DemoSocketIoAdapter } from '../common/websocket/demo-socket-io.adapter';
import { configureApplication } from './configure-application';

jest.mock('compression', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn(() => jest.fn()),
    {
      filter: jest.fn(),
    },
  ),
}));
jest.mock('cookie-parser', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));
jest.mock('express-session', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));
jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));
jest.mock('../common/asyncapi/asyncapi.config', () => ({
  setupAsyncApi: jest.fn(),
}));
jest.mock('../common/openapi/openapi.config', () => ({
  setupOpenApi: jest.fn(),
}));

describe('configureApplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the complete order-sensitive application pipeline', () => {
    const csrfProtection = jest.fn() as RequestHandler;
    const csrfErrorHandler = jest.fn() as ErrorRequestHandler;
    const csrfService = {
      createProtectionMiddleware: jest.fn(() => csrfProtection),
      createErrorHandler: jest.fn(() => csrfErrorHandler),
    };
    const values = new Map<string, unknown>([
      ['PORT', 4100],
      ['NODE_ENV', Environment.Development],
      ['COMPRESSION_ENABLED', true],
      ['SESSION_ENABLED', true],
      ['SESSION_SECRET', 'test-session-secret'],
      ['COOKIE_SECRET', 'test-cookie-secret'],
      ['CORS_ENABLED', true],
      ['CORS_CREDENTIALS', true],
      [
        'rateLimit',
        {
          trustProxy: true,
        } satisfies Partial<RateLimitConfig>,
      ],
    ]);
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) =>
        values.has(key) ? values.get(key) : fallback,
      ),
      getOrThrow: jest.fn((key: string) => {
        if (!values.has(key)) {
          throw new Error(`Missing test config: ${key}`);
        }

        return values.get(key);
      }),
    };
    const enableCors = jest.fn();
    const enableVersioning = jest.fn();
    const set = jest.fn();
    const use = jest.fn();
    const useGlobalPipes = jest.fn();
    const useWebSocketAdapter = jest.fn();
    const app = {
      enableCors,
      enableVersioning,
      get: jest.fn((token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }

        if (token === CsrfService) {
          return csrfService;
        }

        throw new Error('Unexpected provider lookup');
      }),
      set,
      use,
      useGlobalPipes,
      useWebSocketAdapter,
    } as unknown as NestExpressApplication;

    const port = configureApplication(app);
    const helmetMiddleware = jest.mocked(helmet).mock.results[0]
      ?.value as unknown as RequestHandler;
    const compressionMiddleware = jest.mocked(compression).mock.results[0]
      ?.value as unknown as RequestHandler;
    const cookieMiddleware = jest.mocked(cookieParser).mock.results[0]
      ?.value as unknown as RequestHandler;
    const sessionMiddleware = jest.mocked(session).mock.results[0]
      ?.value as unknown as RequestHandler;

    expect(port).toBe(4100);
    expect(set).toHaveBeenCalledWith('trust proxy', true);
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
      expect.any(DemoSocketIoAdapter),
    );
    expect(use.mock.calls).toEqual([
      [helmetMiddleware],
      [compressionMiddleware],
      [cookieMiddleware],
      [sessionMiddleware],
      [csrfProtection],
      [csrfErrorHandler],
    ]);
    expect(useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(enableVersioning).toHaveBeenCalledWith({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });
    expect(setupOpenApi).toHaveBeenCalledWith(app, Environment.Development);
    expect(setupAsyncApi).toHaveBeenCalledWith(
      app,
      Environment.Development,
      4100,
    );

    const invocationOrder = [
      useWebSocketAdapter.mock.invocationCallOrder[0],
      set.mock.invocationCallOrder[0],
      jest.mocked(helmet).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[0],
      enableCors.mock.invocationCallOrder[0],
      jest.mocked(compression).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[1],
      jest.mocked(cookieParser).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[2],
      jest.mocked(session).mock.invocationCallOrder[0],
      use.mock.invocationCallOrder[3],
      use.mock.invocationCallOrder[4],
      use.mock.invocationCallOrder[5],
      useGlobalPipes.mock.invocationCallOrder[0],
      enableVersioning.mock.invocationCallOrder[0],
      jest.mocked(setupOpenApi).mock.invocationCallOrder[0],
      jest.mocked(setupAsyncApi).mock.invocationCallOrder[0],
    ];

    expect(invocationOrder).toEqual(
      [...invocationOrder].sort((left, right) => left - right),
    );
  });

  it('rejects the demo MemoryStore when sessions are enabled in production', () => {
    const values = new Map<string, unknown>([
      ['NODE_ENV', Environment.Production],
      ['SESSION_ENABLED', true],
      ['COMPRESSION_ENABLED', false],
      ['CORS_ENABLED', true],
      ['CORS_ORIGINS', 'https://example.com'],
      [
        'rateLimit',
        {
          trustProxy: true,
        } satisfies Partial<RateLimitConfig>,
      ],
    ]);
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) =>
        values.has(key) ? values.get(key) : fallback,
      ),
      getOrThrow: jest.fn((key: string) => {
        if (!values.has(key)) {
          throw new Error(`Missing test config: ${key}`);
        }

        return values.get(key);
      }),
    };
    const app = {
      enableCors: jest.fn(),
      get: jest.fn((token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }

        throw new Error('Unexpected provider lookup');
      }),
      set: jest.fn(),
      use: jest.fn(),
      useWebSocketAdapter: jest.fn(),
    } as unknown as NestExpressApplication;

    expect(() => configureApplication(app)).toThrow(
      'SESSION_ENABLED=true uses the demo MemoryStore',
    );
    expect(session).not.toHaveBeenCalled();
  });
});
