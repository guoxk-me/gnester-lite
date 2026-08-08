import express from 'express';
import request from 'supertest';

import { BETTER_AUTH_CLIENT_IP_HEADER } from 'config/better-auth.config';
import type { BetterAuthRequestHandler } from '../../platform/security/better-auth/better-auth.service';
import {
  BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES,
  createBetterAuthRequestMiddleware,
} from './better-auth.middleware';

describe('createBetterAuthRequestMiddleware', () => {
  it('leaves the auth payload raw and supplies the trusted Express client IP', async () => {
    const betterAuthHandler: BetterAuthRequestHandler = jest.fn(
      (incomingRequest, serverResponse) => {
        expect(incomingRequest.headers[BETTER_AUTH_CLIENT_IP_HEADER]).toBe(
          '198.51.100.10',
        );
        expect((incomingRequest as express.Request).body).toBeUndefined();
        expect(incomingRequest.readableEnded).toBe(false);
        serverResponse.statusCode = 200;
        serverResponse.end('ok');
        return Promise.resolve();
      },
    );
    const application = express();
    application.set('trust proxy', 'loopback');
    application.use(createBetterAuthRequestMiddleware(betterAuthHandler));

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
    application.use(createBetterAuthRequestMiddleware(betterAuthHandler));

    await request(application)
      .post('/api/auth/sign-up/email')
      .set('content-type', 'text/plain')
      .send('x'.repeat(BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES + 1))
      .expect(413)
      .expect(({ body }) => {
        expect(body).toEqual({
          statusCode: 413,
          code: 'BETTER_AUTH_BODY_TOO_LARGE',
          message: 'Better Auth request body exceeds the 1 MiB limit.',
        });
      });

    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it('leaves adjacent non-auth routes for the normal Nest body parsers', async () => {
    const betterAuthHandler = jest.fn() as BetterAuthRequestHandler;
    const application = express();
    application.use(createBetterAuthRequestMiddleware(betterAuthHandler));
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
