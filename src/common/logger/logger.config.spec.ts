import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Writable } from 'node:stream';

import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';
import pino, { type LoggerOptions } from 'pino';
import pinoHttp, { type Options as PinoHttpOptions } from 'pino-http';
import {
  createPinoLoggerParams,
  nestLevelsToPinoLevel,
  shouldIgnoreRequestLog,
} from './logger.config';

describe('nestLevelsToPinoLevel', () => {
  it('defaults production to info and development to debug', () => {
    expect(nestLevelsToPinoLevel(undefined, Environment.Production)).toBe(
      'info',
    );
    expect(nestLevelsToPinoLevel(undefined, Environment.Development)).toBe(
      'debug',
    );
    expect(nestLevelsToPinoLevel(undefined, Environment.Test)).toBe('warn');
  });

  it('maps the most verbose Nest level to a Pino threshold', () => {
    expect(
      nestLevelsToPinoLevel('error,warn,debug', Environment.Production),
    ).toBe('debug');
    expect(nestLevelsToPinoLevel('log,error', Environment.Production)).toBe(
      'info',
    );
    expect(nestLevelsToPinoLevel('verbose', Environment.Production)).toBe(
      'trace',
    );
  });
});

describe('createPinoLoggerParams', () => {
  it('uses structured JSON logs in production by default', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Production,
        app: {
          name: 'gnester-lite',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      name: 'gnester-lite',
      level: 'info',
      quietReqLogger: true,
      transport: undefined,
    });
    expect((params.pinoHttp as LoggerOptions).redact).toEqual({
      remove: true,
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.proxy-authorization',
        'req.headers["x-csrf-token"]',
        'req.headers["x-xsrf-token"]',
        'res.headers["set-cookie"]',
      ],
    });
  });

  it('removes request and response credentials from structured logs', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Production,
        CSRF_HEADER_NAME: 'x-custom-csrf',
      }),
    );
    const outputChunks: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        outputChunks.push(chunk.toString());
        callback();
      },
    });
    const options = params.pinoHttp as LoggerOptions;

    pino({ redact: options.redact }, destination).info({
      req: {
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: 'Bearer audit-token',
          cookie: 'gnester.sid=audit-session',
          'proxy-authorization': 'Basic audit-proxy',
          'x-csrf-token': 'audit-csrf',
          'x-xsrf-token': 'audit-xsrf',
          'x-custom-csrf': 'audit-custom-csrf',
          accept: 'application/json',
        },
      },
      res: {
        statusCode: 200,
        headers: {
          'set-cookie': 'gnester.sid=rotated-session',
        },
      },
    });

    const serializedLog = outputChunks.join('');

    expect(serializedLog).toContain('"method":"GET"');
    expect(serializedLog).toContain('"statusCode":200');
    expect(serializedLog).toContain('"accept":"application/json"');
    expect(serializedLog).not.toContain('audit-token');
    expect(serializedLog).not.toContain('audit-session');
    expect(serializedLog).not.toContain('audit-csrf');
    expect(serializedLog).not.toContain('audit-xsrf');
    expect(serializedLog).not.toContain('audit-custom-csrf');
    expect(serializedLog).not.toContain('authorization');
    expect(serializedLog).not.toContain('cookie');
  });

  it('logs only allowlisted request metadata through the real pino-http serializer', () => {
    const querySentinel = 'request-query-secret';
    const apiKeySentinel = 'request-api-key-secret';
    const identityTokenSentinel = 'request-identity-token-secret';
    const refererSentinel = 'request-referer-secret';
    const redirectSentinel = 'response-redirect-secret';
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Production,
      }),
    );
    const outputChunks: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        outputChunks.push(chunk.toString());
        callback();
      },
    });
    const requestLogger = pinoHttp(
      params.pinoHttp as PinoHttpOptions,
      destination,
    );
    const request = {
      method: 'GET',
      url: `/v1/search?token=${querySentinel}&keyword=private`,
      query: {
        token: querySentinel,
        keyword: 'private',
      },
      headers: {
        accept: 'application/json',
        'x-api-key': apiKeySentinel,
        'x-goog-iap-jwt-assertion': identityTokenSentinel,
        referer: `https://app.example.com/callback?token=${refererSentinel}`,
      },
      socket: {
        remoteAddress: '127.0.0.1',
        remotePort: 30_000,
      },
    } as unknown as IncomingMessage;
    const response = Object.assign(new EventEmitter(), {
      headersSent: true,
      statusCode: 200,
      writableEnded: true,
      getHeaders: () => ({
        'content-type': 'application/json',
        location: `https://app.example.com/callback?code=${redirectSentinel}`,
      }),
    }) as unknown as ServerResponse;

    requestLogger(request, response);
    response.emit('finish');

    const serializedLog = outputChunks.join('');
    const accessLog = JSON.parse(serializedLog) as {
      readonly req: Record<string, unknown>;
      readonly res: Record<string, unknown>;
    };

    expect(serializedLog).toContain('"url":"/v1/search"');
    expect(serializedLog).not.toContain(querySentinel);
    expect(serializedLog).not.toContain('"query"');
    expect(serializedLog).not.toContain('keyword=private');
    expect(serializedLog).not.toContain(apiKeySentinel);
    expect(serializedLog).not.toContain(identityTokenSentinel);
    expect(serializedLog).not.toContain(refererSentinel);
    expect(serializedLog).not.toContain(redirectSentinel);
    expect(accessLog.req).not.toHaveProperty('headers');
    expect(accessLog.res).toEqual({ statusCode: 200 });
  });

  it('redacts the configured CSRF header name', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        CSRF_HEADER_NAME: 'X-Custom-Csrf',
      }),
    );
    const redact = (params.pinoHttp as LoggerOptions).redact as {
      readonly paths: readonly string[];
    };

    expect(redact.paths).toContain('req.headers["x-custom-csrf"]');
  });

  it('enables pino-pretty when JSON mode is disabled outside test', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Development,
        LOGGER_JSON: false,
        LOGGER_LEVELS: 'error,warn,debug',
        app: {
          name: 'demo-app',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      name: 'demo-app',
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      },
    });
  });

  it('keeps JSON output in test even when LOGGER_JSON is false', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Test,
        LOGGER_JSON: false,
        app: {
          name: 'gnester-lite',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      level: 'warn',
      transport: undefined,
    });
  });

  it('keeps JSON output in production when validation is bypassed', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Production,
        LOGGER_JSON: false,
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      level: 'info',
      transport: undefined,
    });
  });
});

describe('shouldIgnoreRequestLog', () => {
  it.each([
    ['/health', false],
    ['/health/live', true],
    ['/health/ready?verbose=true', true],
    ['/health/anything', false],
    ['/demo-auth/scenarios?probe=/health', false],
    ['/v1/orders/health-history', false],
    ['/v1/%2Fhealth', false],
    ['not a valid URL%', false],
  ])('matches only the health probe pathname for %s', (url, expected) => {
    expect(shouldIgnoreRequestLog({ url } as IncomingMessage)).toBe(expected);
  });
});
