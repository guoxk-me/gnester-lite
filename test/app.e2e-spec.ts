import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { JWT_LOCAL_DEVELOPMENT_SECRET } from '../src/platform/security/auth/jwt-policy';
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

    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/demo-auth/profile (GET) rejects anonymous requests', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    return request(app.getHttpServer()).get('/demo-auth/profile').expect(401);
  });

  it('/demo-authorization/scenarios uses @Public to escape controller authentication', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/demo-authorization/scenarios')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
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
    const loginBody = loginResponse.body as LoginResponseBody;

    expect(typeof loginBody.accessToken).toBe('string');
    expect(loginBody.tokenType).toBe('Bearer');
    expect(loginBody.expiresIn).toBe('15m');

    await request(app.getHttpServer())
      .get('/demo-auth/profile')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
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
        expect(body).toEqual(
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
        expect(body).toEqual([
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
        expect(body).toEqual(
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
        expect(body).toEqual(
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
