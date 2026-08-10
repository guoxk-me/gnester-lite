import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

import { Environment } from 'config/config.types';
import {
  CSRF_LOCAL_DEVELOPMENT_SECRET,
  CsrfService,
  createCsrfOptions,
} from './csrf.service';

describe('createCsrfOptions', () => {
  let configService: ConfigService<Record<string, unknown>>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService<Record<string, unknown>>({});
  });

  it('uses the configured header name as the request token contract', () => {
    configService = new ConfigService<Record<string, unknown>>({
      CSRF_HEADER_NAME: 'x-xsrf-token',
    });
    const options = createCsrfOptions(configService, Environment.Development);

    expect(
      options.getCsrfTokenFromRequest?.({
        headers: {
          'x-xsrf-token': 'request-token',
        },
      } as unknown as Request),
    ).toBe('request-token');
  });

  it('binds tokens to the CSRF identifier cookie before falling back to the express session id', () => {
    const options = createCsrfOptions(configService, Environment.Development);

    expect(
      options.getSessionIdentifier({
        sessionID: 'session-id',
        cookies: {
          'gnester.csrf-id': 'csrf-id',
        },
      } as unknown as Request),
    ).toBe('csrf-id');
    expect(
      options.getSessionIdentifier({
        sessionID: 'session-id',
      } as Request),
    ).toBe('session-id');
  });

  it('uses a local-only fallback secret outside production', () => {
    const options = createCsrfOptions(configService, Environment.Test);

    expect(options.getSecret()).toBe(CSRF_LOCAL_DEVELOPMENT_SECRET);
  });

  it('uses secure host-prefixed cookies in production', () => {
    const options = createCsrfOptions(configService, Environment.Production);

    expect(options.cookieName).toBe('__Host-gnester.csrf-token');
    expect(options.cookieOptions).toMatchObject({
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'lax',
    });
  });
});

describe('CsrfService', () => {
  let configService: ConfigService<Record<string, unknown>>;
  let service: CsrfService;
  const i18n = {
    t: jest.fn(
      (_key: string, options?: { defaultValue?: string; lang?: string }) =>
        options?.defaultValue ?? 'Invalid CSRF token',
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService<Record<string, unknown>>({});
    service = new CsrfService(configService, i18n as never);
  });

  it('reports CSRF protection as enabled by default', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('sets a stable identifier cookie before generating a response token', () => {
    const request = {
      cookies: {},
      headers: {},
    } as Request;
    const response = {
      cookie: jest.fn(),
    } as unknown as jest.Mocked<Pick<Response, 'cookie'>>;

    const token = service.createToken(request, response as unknown as Response);

    expect(typeof token).toBe('string');
    expect(response.cookie).toHaveBeenCalledWith(
      'gnester.csrf-id',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      }),
    );
  });

  it('does not issue tokens when CSRF protection is disabled', () => {
    configService = new ConfigService<Record<string, unknown>>({
      CSRF_ENABLED: false,
    });
    service = new CsrfService(configService, i18n as never);

    expect(() => service.createToken({} as Request, {} as Response)).toThrow(
      ServiceUnavailableException,
    );
  });

  it.each(['/api/auth', '/api/auth/sign-in/email'])(
    'delegates %s requests to Better Auth CSRF protection',
    (path) => {
      const next: NextFunction = jest.fn();

      service.createProtectionMiddleware()(
        {
          path,
          method: 'POST',
          headers: {},
          cookies: {},
        } as unknown as Request,
        {} as Response,
        next,
      );

      expect(next).toHaveBeenCalledWith();
    },
  );

  it('does not exempt a path that only shares the Better Auth prefix', () => {
    const next: NextFunction = jest.fn();

    service.createProtectionMiddleware()(
      {
        path: '/api/auth-malicious',
        method: 'POST',
        headers: {},
        cookies: {},
      } as unknown as Request,
      {} as Response,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' }),
    );
  });

  it('formats invalid CSRF token errors without leaking implementation details', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as jest.Mocked<Pick<Response, 'status' | 'json'>>;
    const next: NextFunction = jest.fn();
    const error = {
      code: 'CSRF_TOKEN_INVALID',
      statusCode: 403,
      message: 'Invalid CSRF token',
    };

    service.createErrorHandler()(
      error,
      {} as Request,
      response as unknown as Response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      code: 403,
      message: 'Invalid CSRF token',
      data: null,
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
