import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import request from 'supertest';

import { ApplicationAuthService } from '../../src/modules/identity/application-auth.service.js';
import { SessionController } from '../../src/modules/identity/session.controller.js';
import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CsrfModule } from '../../src/infra/csrf/csrf.module.js';
import { HttpResponseModule } from '../../src/infra/http/http-response.module.js';

const user = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  image: null,
};

// AI modified: verify the public session contract without coupling HTTP tests to an auth library.
describe('application session endpoints (e2e)', () => {
  let app: NestExpressApplication;
  const signIn = vi.fn(
    async (
      _email: string,
      _password: string,
      _rememberMe: boolean,
      _request: Request,
      response: Response,
    ) => {
      response.cookie('gvueter_access', 'signed-access', {
        httpOnly: true,
        path: '/api',
      });
      response.cookie('gvueter_refresh', 'opaque-refresh', {
        httpOnly: true,
        path: '/api/session',
      });
      return user;
    },
  );
  const requireUser = vi.fn((incomingRequest: Request) => {
    if (!incomingRequest.cookies?.gvueter_access)
      throw new UnauthorizedException();
    return user;
  });
  const refresh = vi.fn(async (_request: Request, response: Response) => {
    response.cookie('gvueter_access', 'renewed-access', {
      httpOnly: true,
      path: '/api',
    });
    return user;
  });
  const signOut = vi.fn(async (_request: Request, response: Response) => {
    response.clearCookie('gvueter_access', { path: '/api' });
    response.clearCookie('gvueter_refresh', { path: '/api/session' });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              CSRF_ENABLED: true,
              CSRF_SECRET: 'session-e2e-csrf-secret',
              COOKIE_SECRET: 'session-e2e-cookie-secret',
              app: { apiPrefix: 'api' },
              rateLimit: { trustProxy: false },
            }),
          ],
        }),
        CsrfModule,
        HttpResponseModule,
      ],
      controllers: [SessionController],
      providers: [
        {
          provide: ApplicationAuthService,
          useValue: { signIn, requireUser, refresh, signOut },
        },
      ],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    await configureApplication(app);
    await app.listen(0);
  });

  afterEach(async () => {
    await app.close();
  });

  it('seeds the readable XSRF cookie on an unauthenticated session check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/session')
      .expect(401);
    expect(response.body).toMatchObject({
      code: 401,
      data: null,
      errors: null,
    });
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^XSRF-TOKEN=/),
        expect.stringMatching(/^gnester\.csrf-id=/),
      ]),
    );
    expect(
      cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN=')),
    ).not.toContain('HttpOnly');
  });

  it('protects login and refresh with XSRF while keeping tokens out of response bodies', async () => {
    const agent = request.agent(app.getHttpServer());
    const unauthenticated = await agent.get('/api/session').expect(401);
    const cookies = unauthenticated.headers[
      'set-cookie'
    ] as unknown as string[];
    const tokenCookie = cookies.find((cookie) =>
      cookie.startsWith('XSRF-TOKEN='),
    );
    const token = decodeURIComponent(
      tokenCookie?.split(';')[0]?.split('=')[1] ?? '',
    );
    const credentials = {
      email: user.email,
      password: 'password123',
      rememberMe: false,
    };

    await agent.post('/api/session/login').send(credentials).expect(403);
    const login = await agent
      .post('/api/session/login')
      .set('X-XSRF-TOKEN', token)
      .send(credentials)
      .expect(200);
    expect(login.body.data).toEqual(user);
    expect(JSON.stringify(login.body)).not.toContain('signed-access');
    expect(login.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^gvueter_access=/),
        expect.stringMatching(/^gvueter_refresh=/),
      ]),
    );
    expect(signIn).toHaveBeenCalledOnce();

    const renewed = await agent
      .post('/api/session/refresh')
      .set('X-XSRF-TOKEN', token)
      .expect(200);
    expect(renewed.body.data).toEqual(user);
    expect(refresh).toHaveBeenCalledOnce();
    await agent.get('/api/session').expect(200);
    const logout = await agent
      .post('/api/session/logout')
      .set('X-XSRF-TOKEN', token)
      .expect(200);
    expect(logout.body.data).toBeNull();
    expect(logout.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^gvueter_access=;/),
        expect.stringMatching(/^gvueter_refresh=;/),
      ]),
    );
  });
});
