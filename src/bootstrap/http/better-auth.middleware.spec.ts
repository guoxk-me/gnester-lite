import { request as createHttpRequest } from 'node:http';

import express from 'express';
import type { I18nService } from 'nestjs-i18n';
import request from 'supertest';

import { BETTER_AUTH_CLIENT_IP_HEADER } from 'config/better-auth.config';
import type { BetterAuthRequestHandler } from '../../platform/security/better-auth/better-auth.service';
import {
  BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES,
  createBetterAuthRequestMiddleware,
} from './better-auth.middleware';

describe('createBetterAuthRequestMiddleware', () => {
  const i18nService = {
    translate: (
      key: string,
      options: { readonly defaultValue?: string; readonly lang?: string },
    ): string =>
      key === 'http.413' && options.lang === 'zh'
        ? '请求体过大'
        : (options.defaultValue ?? key),
  } as unknown as I18nService;

  it('buffers the raw auth payload without parsing it and supplies the trusted client IP', async () => {
    const betterAuthHandler: BetterAuthRequestHandler = jest.fn(
      (incomingRequest, serverResponse) => {
        expect(incomingRequest.headers[BETTER_AUTH_CLIENT_IP_HEADER]).toBe(
          '198.51.100.10',
        );
        expect((incomingRequest as express.Request).body).toBe(
          '{"email":"user@example.com"}',
        );
        expect(incomingRequest.readableEnded).toBe(true);
        serverResponse.statusCode = 200;
        serverResponse.end('ok');
        return Promise.resolve();
      },
    );
    const application = express();
    application.set('trust proxy', 'loopback');
    application.use(
      createBetterAuthRequestMiddleware(betterAuthHandler, i18nService),
    );

    await request(application)
      .post('/api/auth/sign-in/email')
      .set('content-type', 'application/json')
      .set('x-forwarded-for', '198.51.100.10')
      .set(BETTER_AUTH_CLIENT_IP_HEADER, '203.0.113.20')
      .send('{"email":"user@example.com"}')
      .expect(200, 'ok');

    expect(betterAuthHandler).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized auth payloads before invoking Better Auth', async () => {
    const betterAuthHandler = jest.fn() as BetterAuthRequestHandler;
    const application = express();
    application.use(
      createBetterAuthRequestMiddleware(betterAuthHandler, i18nService),
    );

    await request(application)
      .post('/api/auth/sign-up/email')
      .set('content-type', 'text/plain')
      .set('accept-language', 'en;q=0.1, zh-CN;q=0.9')
      .send('x'.repeat(BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES + 1))
      .expect(413)
      .expect('content-language', 'zh')
      .expect('vary', /Accept-Language/i)
      .expect(({ body }) => {
        expect(body).toEqual({
          code: 413,
          message: '请求体过大',
          data: null,
          errors: null,
        });
      });

    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it('rejects oversized chunked auth payloads after draining the request', async () => {
    const betterAuthHandler = jest.fn() as BetterAuthRequestHandler;
    const application = express();
    application.use(
      createBetterAuthRequestMiddleware(betterAuthHandler, i18nService),
    );
    const server = application.listen(0);

    await new Promise<void>((resolve) => {
      server.once('listening', resolve);
    });
    const address = server.address();

    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Expected the test server to listen on a TCP port');
    }

    try {
      const response = await new Promise<{
        readonly body: string;
        readonly contentLanguage: string | undefined;
        readonly statusCode: number | undefined;
      }>((resolve, reject) => {
        const outgoingRequest = createHttpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            method: 'POST',
            path: '/api/auth/sign-up/email',
            headers: {
              'accept-language': 'zh',
              'content-type': 'text/plain',
              'transfer-encoding': 'chunked',
            },
          },
          (incomingResponse) => {
            const responseChunks: Buffer[] = [];

            incomingResponse.on('data', (responseChunk: Buffer) => {
              responseChunks.push(responseChunk);
            });
            incomingResponse.once('error', reject);
            incomingResponse.once('end', () => {
              resolve({
                body: Buffer.concat(responseChunks).toString('utf8'),
                contentLanguage: incomingResponse.headers['content-language'],
                statusCode: incomingResponse.statusCode,
              });
            });
          },
        );

        outgoingRequest.once('error', reject);
        outgoingRequest.write('x'.repeat(600_000));
        outgoingRequest.end('y'.repeat(600_000));
      });

      expect(response.statusCode).toBe(413);
      expect(response.contentLanguage).toBe('zh');
      expect(JSON.parse(response.body) as unknown).toEqual({
        code: 413,
        message: '请求体过大',
        data: null,
        errors: null,
      });
      expect(betterAuthHandler).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((serverError) => {
          if (serverError) {
            reject(serverError);
            return;
          }

          resolve();
        });
      });
    }
  });

  it('leaves adjacent non-auth routes for the normal Nest body parsers', async () => {
    const betterAuthHandler = jest.fn() as BetterAuthRequestHandler;
    const application = express();
    application.use(
      createBetterAuthRequestMiddleware(betterAuthHandler, i18nService),
    );
    application.use(express.json());
    application.post('/api/authentication', (incomingRequest, response) => {
      response.json(incomingRequest.body);
    });

    await request(application)
      .post('/api/authentication')
      .send({ business: 'payload' })
      .expect(200, { business: 'payload' });

    expect(betterAuthHandler).not.toHaveBeenCalled();
  });
});
