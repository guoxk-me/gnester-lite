import { HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request, { type Response } from 'supertest';

import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CsrfModule } from '../../src/csrf/csrf.module.js';
import { DemoSessionModule } from '../../src/examples/demo-session/demo-session.module.js';
import { betterAuthTestProvider } from '../fixtures/better-auth.stub.js';

const SESSION_COOKIE_NAME = 'gnester.test.sid';

describe('Express session lifecycle (e2e)', () => {
  let app: NestExpressApplication | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              COMPRESSION_ENABLED: false,
              CORS_ENABLED: false,
              CSRF_ENABLED: false,
              SESSION_ENABLED: true,
              SESSION_SECRET: 'session-e2e-secret-at-least-32-bytes',
              SESSION_COOKIE_NAME,
              SESSION_COOKIE_MAX_AGE: 86_400_000,
              SESSION_COOKIE_SECURE: false,
              SESSION_COOKIE_SAME_SITE: 'lax',
              app: {
                apiPrefix: 'api',
              },
              rateLimit: {
                enabled: false,
                trustProxy: false,
                errorMessage: 'Too many requests',
                throttlers: [
                  {
                    name: 'short',
                    ttl: 60_000,
                    limit: 100,
                  },
                ],
              },
            }),
          ],
        }),
        CsrfModule,
        DemoSessionModule,
      ],
      providers: [betterAuthTestProvider],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    // AI modified: exercise the real express-session middleware and cookie jar.
    await configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('persists bounded anonymous state with secure cookie attributes', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const agent = request.agent(app.getHttpServer());
    const visitResponse = await agent
      .post('/api/demo-session/visits')
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          authenticated: false,
          visits: 1,
        });
      });
    const sessionCookie = requireSessionCookie(visitResponse);

    expect(sessionCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(sessionCookie).toContain('; Path=/');
    expect(sessionCookie).toContain('; Expires=');
    expect(sessionCookie).toContain('; HttpOnly');
    expect(sessionCookie).toContain('; SameSite=Lax');
    expect(sessionCookie).not.toContain('; Secure');

    await agent
      .post('/api/demo-session/cart/items')
      .send({
        sku: 'demo_sku',
        name: 'Demo Item',
        quantity: 2,
      })
      .expect(201);
    await agent
      .post('/api/demo-session/flash')
      .send({
        level: 'success',
        message: 'Anonymous state preserved',
      })
      .expect(201);

    await agent
      .get('/api/demo-session')
      .expect(200)
      .expect('Cache-Control', 'private, no-store')
      .expect(({ body }) => {
        expect(body).toMatchObject({
          authenticated: false,
          visits: 1,
          cartItemCount: 2,
          cart: [
            expect.objectContaining({
              sku: 'demo_sku',
              quantity: 2,
            }),
          ],
          flashMessages: [
            expect.objectContaining({
              level: 'success',
              message: 'Anonymous state preserved',
            }),
          ],
        });
      });
  });

  it('rejects undeclared DTO fields through the real global validation pipe', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const secretSentinel = 'validation-http-private-value';
    // AI modified: DTO validation follows the shared 422 API contract.
    const response = await request(app.getHttpServer())
      .post('/api/demo-session/login')
      .send({
        userId: 'user_1',
        displayName: 'Demo User',
        unexpected: secretSentinel,
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(response.body).toMatchObject({
      code: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      data: null,
      errors: [
        {
          field: 'unexpected',
          reason: 'property unexpected should not exist',
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain(secretSentinel);
  });

  it('rotates the session id on login and destroys authenticated state on logout', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const httpServer = app.getHttpServer();
    const agent = request.agent(httpServer);
    const anonymousResponse = await agent
      .post('/api/demo-session/visits')
      .expect(201);
    const anonymousCookie = requireSessionCookie(anonymousResponse);
    const anonymousCookiePair = readSessionCookiePair(anonymousCookie);

    await agent
      .post('/api/demo-session/cart/items')
      .send({ sku: 'before_login', quantity: 3 })
      .expect(201);
    await agent
      .post('/api/demo-session/flash')
      .send({ message: 'Welcome back' })
      .expect(201);

    const loginResponse = await agent
      .post('/api/demo-session/login')
      .send({
        userId: 'user_1',
        displayName: 'Demo User',
        role: 'admin',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          authenticated: true,
          user: {
            userId: 'user_1',
            displayName: 'Demo User',
            role: 'admin',
          },
          visits: 1,
          cartItemCount: 3,
          flashMessages: [
            expect.objectContaining({
              message: 'Welcome back',
            }),
          ],
        });
      });
    const authenticatedCookie = requireSessionCookie(loginResponse);
    const authenticatedCookiePair = readSessionCookiePair(authenticatedCookie);

    // AI modified: prove fixation-safe rotation at the HTTP cookie boundary.
    expect(authenticatedCookiePair).not.toBe(anonymousCookiePair);

    await request(httpServer)
      .get('/api/demo-session')
      .set('Cookie', anonymousCookiePair)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          authenticated: false,
          user: null,
          visits: 0,
          flashMessages: [],
          cart: [],
          cartItemCount: 0,
        });
      });

    await agent
      .get('/api/demo-session')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          authenticated: true,
          visits: 1,
          cartItemCount: 3,
        });
      });

    await agent.delete('/api/demo-session').expect(200).expect({
      authenticated: false,
      user: null,
      visits: 0,
      flashMessages: [],
      cart: [],
      cartItemCount: 0,
    });

    await request(httpServer)
      .get('/api/demo-session')
      .set('Cookie', authenticatedCookiePair)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          authenticated: false,
          user: null,
          visits: 0,
          flashMessages: [],
          cart: [],
          cartItemCount: 0,
        });
      });
  });
});

function requireSessionCookie(response: Response): string {
  const sessionCookie = response
    .get('Set-Cookie')
    ?.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) {
    throw new Error('Expected the response to set the session cookie.');
  }

  return sessionCookie;
}

function readSessionCookiePair(sessionCookie: string): string {
  const [cookiePair] = sessionCookie.split(';', 1);

  if (!cookiePair) {
    throw new Error('Expected a session cookie name-value pair.');
  }

  return cookiePair;
}
