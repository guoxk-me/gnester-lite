import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import type { ApiEnvelope } from '../src/contracts/api-envelope';
import { JWT_LOCAL_DEVELOPMENT_SECRET } from '../src/platform/security/auth/jwt-policy';
import { CommonI18nModule } from '../src/platform/runtime/i18n/i18n.module';
import { DemoAuthModule } from '../src/examples/demo-auth/demo-auth.module';
import { DemoAuthorizationModule } from '../src/examples/demo-authorization/demo-authorization.module';

interface LoginResponseBody {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

interface TestAccessTokenClaims {
  readonly sub: string;
  readonly username: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          isGlobal: true,
        }),
        // AI modified: exercise the same localized response envelope as the application composition root.
        CommonI18nModule,
        DemoAuthModule,
        DemoAuthorizationModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('/ (GET)', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    return request(app.getHttpServer()).get('/').expect(200).expect({
      code: 200,
      message: 'Success',
      data: 'Hello World!',
      errors: null,
    });
  });

  it('/ (GET) negotiates Chinese and declares cache variation', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    // AI modified: verify the resolver, request context, envelope, and cache headers together.
    await request(app.getHttpServer())
      .get('/')
      .set('Accept-Language', 'zh-CN;q=1,en;q=0.8')
      .expect(200)
      .expect('Content-Language', 'zh')
      .expect('Vary', /Accept-Language/)
      .expect({
        code: 200,
        message: '成功',
        data: '你好，世界！',
        errors: null,
      });
  });

  it('/demo-auth/profile (GET) rejects anonymous requests', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    return request(app.getHttpServer()).get('/demo-auth/profile').expect(401);
  });

  it('/demo-auth/profile localizes the default unauthorized response', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/demo-auth/profile')
      .set('Accept-Language', 'zh')
      .expect(401)
      .expect('Content-Language', 'zh')
      .expect(({ body }) => {
        expect(body).toEqual({
          code: 401,
          message: '未授权',
          data: null,
          errors: null,
        });
      });
  });

  it('preserves and localizes adapter-level payload limits', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    // AI modified: Express body-parser errors must keep their client-error status through the global filter.
    await request(app.getHttpServer())
      .post('/demo-auth/login')
      .set('Accept-Language', 'zh')
      .send({ oversized: 'x'.repeat(110_000) })
      .expect(413)
      .expect('Content-Language', 'zh')
      .expect(({ body }) => {
        expect(body).toEqual({
          code: 413,
          message: '请求体过大',
          data: null,
          errors: null,
        });
      });
  });

  it('localizes the framework-generated missing-route response', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/missing-i18n-route')
      .set('Accept-Language', 'zh')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual({
          code: 404,
          message: '未找到',
          data: null,
          errors: null,
        });
      });
  });

  it('/demo-authorization/scenarios uses @Public to escape controller authentication', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/demo-authorization/scenarios')
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'Public route escape hatch',
              nestPattern:
                'Controller-level AuthGuard + @Public() escape hatch',
            }),
          ]),
        );
      });
  });

  it.each([
    '/demo-authorization/admin-report',
    '/demo-authorization/audit-log',
    '/demo-authorization/users/demo-user/profile',
  ])('%s rejects anonymous requests before authorization', async (path) => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer()).get(path).expect(401);
  });

  it('/demo-auth/login (POST) issues a token for the protected profile route', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const loginResponse = await request(app.getHttpServer())
      .post('/demo-auth/login')
      .send({ username: 'admin@example.com', password: 'admin12345' })
      .expect(200);
    const loginBody = (loginResponse.body as ApiEnvelope<LoginResponseBody>)
      .data;

    if (!loginBody) {
      throw new Error('Login response did not contain envelope data.');
    }

    expect(typeof loginBody.accessToken).toBe('string');
    expect(loginBody.tokenType).toBe('Bearer');
    expect(loginBody.expiresIn).toBe('15m');

    await request(app.getHttpServer())
      .get('/demo-auth/profile')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual(
          expect.objectContaining({
            sub: 'demo-admin',
            username: 'admin@example.com',
            roles: ['admin'],
          }),
        );
      });
  });

  it.each([
    ['wrong issuer', 'HS256', 'another-service', 'gnester-lite'],
    ['wrong audience', 'HS256', 'gnester-lite', 'another-client'],
    ['wrong algorithm', 'HS512', 'gnester-lite', 'gnester-lite'],
  ] as const)(
    '/demo-auth/profile rejects a token with %s',
    async (_scenario, algorithm, issuer, audience) => {
      if (!app) {
        throw new Error('Nest application was not initialized');
      }

      const token = await new JwtService().signAsync(
        {
          sub: 'demo-admin',
          username: 'admin@example.com',
          roles: ['admin'],
        },
        {
          secret: JWT_LOCAL_DEVELOPMENT_SECRET,
          algorithm,
          issuer,
          audience,
          expiresIn: '15m',
        },
      );

      await request(app.getHttpServer())
        .get('/demo-auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    },
  );

  it('/demo-auth/profile rejects a signed token without identity claims', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const token = await new JwtService().signAsync(
      {
        username: 'admin@example.com',
      },
      {
        secret: JWT_LOCAL_DEVELOPMENT_SECRET,
        algorithm: 'HS256',
        issuer: 'gnester-lite',
        audience: 'gnester-lite',
        expiresIn: '15m',
      },
    );

    await request(app.getHttpServer())
      .get('/demo-auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects expired tokens through Passport and hand-written auth guards', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const expiredToken = await signTestAccessToken(
      {
        sub: 'demo-admin',
        username: 'admin@example.com',
        roles: ['admin'],
        permissions: ['audit:read'],
      },
      -1,
    );

    for (const path of [
      '/demo-auth/profile',
      '/demo-authorization/admin-report',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    }
  });

  it('enforces 403 and 200 authorization outcomes for roles, permissions, and policies', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const memberToken = await signTestAccessToken({
      sub: 'demo-user',
      username: 'user@example.com',
      roles: ['member'],
      permissions: [],
    });
    const auditorToken = await signTestAccessToken({
      sub: 'demo-auditor',
      username: 'auditor@example.com',
      roles: ['member'],
      permissions: ['audit:read'],
    });
    const adminToken = await signTestAccessToken({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read'],
    });

    await request(app.getHttpServer())
      .get('/demo-authorization/admin-report')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/demo-authorization/admin-report')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual(
          expect.objectContaining({
            generatedFor: 'demo-admin',
          }),
        );
      });

    await request(app.getHttpServer())
      .get('/demo-authorization/audit-log')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/demo-authorization/audit-log')
      .set('Authorization', `Bearer ${auditorToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual([
          expect.objectContaining({
            actor: 'demo-auditor',
            resource: 'audit-log',
          }),
        ]);
      });

    await request(app.getHttpServer())
      .get('/demo-authorization/users/demo-user/profile')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual(
          expect.objectContaining({
            id: 'demo-user',
            viewedBy: 'demo-user',
          }),
        );
      });
    await request(app.getHttpServer())
      .get('/demo-authorization/users/demo-other/profile')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/demo-authorization/users/demo-other/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as unknown as ApiEnvelope<unknown>).data).toEqual(
          expect.objectContaining({
            id: 'demo-other',
            viewedBy: 'demo-admin',
          }),
        );
      });
  });
});

// AI modified: e2e callers can exercise exact authentication and authorization claims.
function signTestAccessToken(
  claims: TestAccessTokenClaims,
  expiresIn: '15m' | number = '15m',
): Promise<string> {
  return new JwtService().signAsync(claims, {
    secret: JWT_LOCAL_DEVELOPMENT_SECRET,
    algorithm: 'HS256',
    issuer: 'gnester-lite',
    audience: 'gnester-lite',
    expiresIn,
  });
}
