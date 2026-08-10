import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { configureApplication } from '../src/bootstrap/configure-application';
import { CommonCsrfModule } from '../src/platform/security/csrf/csrf.module';
import { CommonRateLimitModule } from '../src/platform/security/rate-limit/rate-limit.module';
import { DemoRateLimitModule } from '../src/examples/demo-rate-limit/demo-rate-limit.module';
import { betterAuthTestProvider } from './better-auth.stub';

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
              SESSION_ENABLED: false,
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
        CommonCsrfModule,
        CommonRateLimitModule,
        DemoRateLimitModule,
      ],
      providers: [betterAuthTestProvider],
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

  it('limits public demo routes after the configured default budget', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .expect(429);
  });

  it('uses stricter endpoint overrides for credential-style routes', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .post('/demo-rate-limit/login')
      .expect(201);
    await request(app.getHttpServer())
      .post('/demo-rate-limit/login')
      .expect(429);
  });

  it('allows explicitly skipped endpoints to bypass throttling', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/demo-rate-limit/health')
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/health')
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/health')
      .expect(200);
  });

  it('separates trusted forwarded clients into independent budgets', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const firstClientIp = '198.51.100.10';
    const secondClientIp = '203.0.113.20';

    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', secondClientIp)
      .expect(200);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', firstClientIp)
      .expect(429);
    await request(app.getHttpServer())
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', secondClientIp)
      .expect(200);
  });

  it('ignores forwarded identities when no proxy is trusted', async () => {
    await app?.close();
    app = await createRateLimitApplication(false);
    const httpServer = app.getHttpServer();

    await request(httpServer)
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', '198.51.100.10')
      .expect(200);
    await request(httpServer)
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', '203.0.113.20')
      .expect(200);
    await request(httpServer)
      .get('/demo-rate-limit/default')
      .set('X-Forwarded-For', '192.0.2.30')
      .expect(429);
  });
});
