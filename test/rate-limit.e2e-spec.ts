// CN: 端到端测试，验证 application e2e 的真实应用流程；EN: E2E test verifies real application flows for application e2e.
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { CommonRateLimitModule } from '../src/common/rate-limit/rate-limit.module';
import { DemoRateLimitModule } from '../src/features/demo-rate-limit/demo-rate-limit.module';

// CN: 测试分组：Rate limiting (e2e)；EN: Test group: Rate limiting (e2e).
describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App> | undefined;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              rateLimit: {
                enabled: true,
                trustProxy: 'loopback',
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
        CommonRateLimitModule,
        DemoRateLimitModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    await app?.close();
  });

  // CN: 测试用例：limits public demo routes after the configured default budget；EN: Test case: limits public demo routes after the configured default budget.
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

  // CN: 测试用例：uses stricter endpoint overrides for credential-style routes；EN: Test case: uses stricter endpoint overrides for credential-style routes.
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

  // CN: 测试用例：allows explicitly skipped endpoints to bypass throttling；EN: Test case: allows explicitly skipped endpoints to bypass throttling.
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
});
