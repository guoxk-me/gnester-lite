// CN: 测试文件，验证 csrf common 的行为契约；EN: Test file verifies behavior contracts for csrf common.
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

import { Environment } from 'config/config.types';
import {
  CSRF_LOCAL_DEVELOPMENT_SECRET,
  CsrfService,
  createCsrfOptions,
} from './csrf.service';

// CN: 测试分组：createCsrfOptions；EN: Test group: createCsrfOptions.
describe('createCsrfOptions', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'get'>> = {
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  };

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => defaultValue,
    );
  });

  // CN: 测试用例：uses the configured header name as the request token contract；EN: Test case: uses the configured header name as the request token contract.
  it('uses the configured header name as the request token contract', () => {
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) =>
        key === 'CSRF_HEADER_NAME' ? 'x-xsrf-token' : defaultValue,
    );
    const options = createCsrfOptions(configService, Environment.Development);

    expect(
      options.getCsrfTokenFromRequest({
        headers: {
          'x-xsrf-token': 'request-token',
        },
      } as Request),
    ).toBe('request-token');
  });

  // CN: 测试用例：binds tokens to the CSRF identifier cookie before falling back to the express session id；EN: Test case: binds tokens to the CSRF identifier cookie before falling back to the express session id.
  it('binds tokens to the CSRF identifier cookie before falling back to the express session id', () => {
    const options = createCsrfOptions(configService, Environment.Development);

    expect(
      options.getSessionIdentifier({
        sessionID: 'session-id',
        cookies: {
          'gnester.csrf-id': 'csrf-id',
        },
      } as Request),
    ).toBe('csrf-id');
    expect(
      options.getSessionIdentifier({
        sessionID: 'session-id',
      } as Request),
    ).toBe('session-id');
  });

  // CN: 测试用例：uses a local-only fallback secret outside production；EN: Test case: uses a local-only fallback secret outside production.
  it('uses a local-only fallback secret outside production', () => {
    const options = createCsrfOptions(configService, Environment.Test);

    expect(options.getSecret()).toBe(CSRF_LOCAL_DEVELOPMENT_SECRET);
  });

  // CN: 测试用例：uses secure host-prefixed cookies in production；EN: Test case: uses secure host-prefixed cookies in production.
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

// CN: 测试分组：CsrfService；EN: Test group: CsrfService.
describe('CsrfService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'get'>> = {
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  };
  let service: CsrfService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => defaultValue,
    );
    service = new CsrfService(configService as ConfigService);
  });

  // CN: 测试用例：reports CSRF protection as enabled by default；EN: Test case: reports CSRF protection as enabled by default.
  it('reports CSRF protection as enabled by default', () => {
    expect(service.isEnabled()).toBe(true);
  });

  // CN: 测试用例：sets a stable identifier cookie before generating a response token；EN: Test case: sets a stable identifier cookie before generating a response token.
  it('sets a stable identifier cookie before generating a response token', () => {
    const request = {
      cookies: {},
      headers: {},
    } as Request;
    const response = {
      cookie: jest.fn(),
    } as unknown as jest.Mocked<Pick<Response, 'cookie'>>;

    const token = service.createToken(request, response as Response);

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

  // CN: 测试用例：does not issue tokens when CSRF protection is disabled；EN: Test case: does not issue tokens when CSRF protection is disabled.
  it('does not issue tokens when CSRF protection is disabled', () => {
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) =>
        key === 'CSRF_ENABLED' ? false : defaultValue,
    );
    service = new CsrfService(configService as ConfigService);

    expect(() => service.createToken({} as Request, {} as Response)).toThrow(
      ServiceUnavailableException,
    );
  });

  // CN: 测试用例：formats invalid CSRF token errors without leaking implementation details；EN: Test case: formats invalid CSRF token errors without leaking implementation details.
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
      response as Response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
