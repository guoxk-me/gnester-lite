import { Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SkipHttpThrottle } from '../../src/common/http/skip-http-throttle.decorator.js';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CsrfModule } from '../../src/infra/csrf/csrf.module.js';
import { RateLimitModule } from '../../src/infra/rate-limit/rate-limit.module.js';
// AI modified: test-owned HTTP routes exercise limits and opt-outs without retaining Demo controllers.
@Controller({ path: 'rate-limit-fixture', version: VERSION_NEUTRAL })
class RateLimitFixtureController {
  @Get('default') read(): object {
    return { ok: true };
  }
  @Post('login')
  @Throttle({ short: { limit: 1, ttl: 60000 } })
  login(): object {
    return { ok: true };
  }
  @Get('health') @SkipHttpThrottle() health(): object {
    return { ok: true };
  }
}

describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication | undefined;

  beforeEach(async () => {
    app = await createRateLimitApplication('loopback');
  });

  afterEach(async () => {
    await app?.close();
  });

  async function createRateLimitApplication(
    trustProxy: string | boolean,
  ): Promise<NestExpressApplication> {
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

              app: {
                apiPrefix: 'api',
              },
              rateLimit: {
                enabled: true,
                trustProxy,
                errorMessage: 'Too many requests',
                throttlers: [
                  {
                    name: 'short',
                    ttl: 60000,
                    limit: 2,
                  },
                ],
              },
            }),
          ],
        }),
        CsrfModule,
        RateLimitModule,
      ],
      controllers: [RateLimitFixtureController],
    }).compile();

    const rateLimitApplication =
      moduleFixture.createNestApplication<NestExpressApplication>({
        bodyParser: false,
      });
    // AI modified: exercise trust proxy and the same middleware pipeline used at runtime.
    await configureApplication(rateLimitApplication);
    await rateLimitApplication.init();

    return rateLimitApplication;
  }

  it('limits public routes after the configured default budget', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .expect(429);
  });

  it('uses stricter endpoint overrides for credential-style routes', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .post('/api/rate-limit-fixture/login')
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/rate-limit-fixture/login')
      .expect(429);
  });

  it('allows explicitly skipped endpoints to bypass throttling', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/health')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/health')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/health')
      .expect(200);
  });

  it('separates trusted forwarded clients into independent budgets', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const firstClientIp = '198.51.100.10';
    const secondClientIp = '203.0.113.20';

    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', secondClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(429);
    await request(app.getHttpServer())
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', secondClientIp)
      .expect(200);
  });

  it('ignores forwarded identities when no proxy is trusted', async () => {
    await app?.close();
    app = await createRateLimitApplication(false);
    const httpServer = app.getHttpServer();

    await request(httpServer)
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', '198.51.100.10')
      .expect(200);
    await request(httpServer)
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', '203.0.113.20')
      .expect(200);
    await request(httpServer)
      .get('/api/rate-limit-fixture/default')
      .set('X-Forwarded-For', '192.0.2.30')
      .expect(429);
  });
});
