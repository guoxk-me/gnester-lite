import {
  type ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { I18nService } from 'nestjs-i18n';

import { ApiExceptionFilter } from './api-exception.filter';
import { SKIP_API_ENVELOPE_KEY } from './i18n.constants';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

describe('ApiExceptionFilter', () => {
  const reply = jest.fn();
  const httpAdapterHost = {
    httpAdapter: {
      reply,
    },
  } as unknown as HttpAdapterHost;
  const defaultI18nService = {
    translate: (
      key: string,
      options: { readonly defaultValue?: string },
    ): string => options.defaultValue ?? key,
  } as unknown as I18nService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves body-parser payload-too-large responses without reporting them', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const request = {
      headers: {
        'accept-language': 'zh-CN,en;q=0.8',
      },
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    const payloadTooLargeError = Object.assign(
      new Error('request entity too large'),
      {
        expose: true,
        status: 413,
        statusCode: 413,
        type: 'entity.too.large',
      },
    );
    const i18nService = {
      translate: (
        key: string,
        options: { readonly defaultValue?: string; readonly lang?: string },
      ): string =>
        key === 'http.413' && options.lang === 'zh'
          ? '请求体过大'
          : (options.defaultValue ?? key),
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      payloadTooLargeError,
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        code: 413,
        message: '请求体过大',
        data: null,
        errors: null,
      },
      413,
    );
    expect(response.vary).toHaveBeenCalledWith('Accept-Language');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Language', 'zh');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('recognizes a controlled adapter error that exposes only status', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    const controlledAdapterError = Object.assign(
      new Error('upstream gateway failed'),
      {
        status: 502,
      },
    );

    new ApiExceptionFilter(httpAdapterHost, defaultI18nService).catch(
      controlledAdapterError,
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 502,
      }),
      502,
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('preserves the native Terminus body when the route skips the API envelope', () => {
    const healthBody = {
      status: 'error',
      info: {},
      error: {
        database: {
          status: 'down',
        },
      },
      details: {
        database: {
          status: 'down',
        },
      },
    };
    const response = {
      headersSent: false,
      locals: {
        [SKIP_API_ENVELOPE_KEY]: true,
      },
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter(httpAdapterHost, defaultI18nService).catch(
      new ServiceUnavailableException(healthBody),
      host,
    );

    expect(reply).toHaveBeenCalledWith(response, healthBody, 503);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('localizes a default Nest HTTP exception from its status', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          headers: {
            'accept-language': 'zh',
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    const i18nService = {
      translate: (
        key: string,
        options: { readonly defaultValue?: string },
      ): string =>
        key === 'http.401' ? '未授权' : (options.defaultValue ?? key),
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      new UnauthorizedException(),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        code: 401,
        message: '未授权',
        data: null,
        errors: null,
      },
      401,
    );
  });

  it('preserves an explicit dotted business message as a literal', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    new ApiExceptionFilter(httpAdapterHost, defaultI18nService).catch(
      new BadRequestException('api.example.com is unavailable'),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        message: 'api.example.com is unavailable',
      }),
      400,
    );
  });

  it('uses a localized status fallback for an uncatalogued business literal', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          headers: {
            'accept-language': 'zh',
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    const i18nService = {
      translate: (
        key: string,
        options: { readonly defaultValue?: string },
      ): string =>
        key === 'http.400' ? '错误的请求' : (options.defaultValue ?? key),
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      new BadRequestException('Upstream business rule failed'),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 400,
        message: '错误的请求',
      }),
      400,
    );
  });

  it('does not expose a missing translation key to clients', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          headers: {
            'accept-language': 'zh',
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    const i18nService = {
      translate: (
        key: string,
        options: { readonly defaultValue?: string },
      ): string =>
        key === 'http.404' ? '未找到' : (options.defaultValue ?? key),
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      new NotFoundException('errors.DOES_NOT_EXIST'),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        message: '未找到',
      }),
      404,
    );
    expect(JSON.stringify(reply.mock.calls.at(-1))).not.toContain(
      'DOES_NOT_EXIST',
    );
  });

  it('uses an explicit message key with arguments while keeping code equal to HTTP status', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    const i18nService = {
      translate: (
        key: string,
        options?: { readonly args?: Record<string, unknown> },
      ): string =>
        key === 'errors.CSRF_DISABLED' && options?.args?.component === 'csrf'
          ? 'CSRF protection is disabled.'
          : key,
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      new BadRequestException({
        code: 9_001,
        messageKey: 'errors.CSRF_DISABLED',
        messageArgs: {
          component: 'csrf',
        },
      }),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        code: 400,
        message: 'CSRF protection is disabled.',
        data: null,
        errors: null,
      },
      400,
    );
  });

  it('rethrows exceptions from non-HTTP transports', () => {
    const transportError = new Error('RPC failed');
    const host = {
      getType: () => 'rpc',
    } as unknown as ArgumentsHost;

    expect(() =>
      new ApiExceptionFilter(httpAdapterHost, defaultI18nService).catch(
        transportError,
        host,
      ),
    ).toThrow(transportError);
    expect(reply).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('localizes a router-generated not-found exception without exposing the request path', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          headers: {
            'accept-language': 'zh',
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    const i18nService = {
      translate: (
        key: string,
        options: { readonly defaultValue?: string },
      ): string =>
        key === 'http.404' ? '未找到' : (options.defaultValue ?? key),
    } as unknown as I18nService;

    new ApiExceptionFilter(httpAdapterHost, i18nService).catch(
      new NotFoundException('Cannot GET /private-resource'),
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        code: 404,
        message: '未找到',
      }),
      404,
    );
  });

  it('reports and logs an unexpected error while returning a safe 500 envelope', () => {
    const response = {
      headersSent: false,
      locals: {},
      setHeader: jest.fn(),
      vary: jest.fn(),
    };
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    const unexpectedError = new Error('database-password-leak');
    const frameworkLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    new ApiExceptionFilter(httpAdapterHost, defaultI18nService).catch(
      unexpectedError,
      host,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(unexpectedError);
    expect(frameworkLogger).toHaveBeenCalledWith(unexpectedError);
    expect(reply).toHaveBeenCalledWith(
      response,
      {
        code: 500,
        message: 'Internal Server Error',
        data: null,
        errors: null,
      },
      500,
    );
    frameworkLogger.mockRestore();
  });
});
