// CN: 端到端测试，验证 application e2e 的真实应用流程；EN: E2E test verifies real application flows for application e2e.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import request from 'supertest';
import { App } from 'supertest/types';

import { CommonCsrfModule } from '../src/common/csrf/csrf.module';
import { CsrfService } from '../src/common/csrf/csrf.service';
import { DemoCsrfModule } from '../src/features/demo-csrf/demo-csrf.module';

interface CsrfTokenResponseBody {
  csrfToken: string;
  headerName: string;
}

// CN: 测试分组：CSRF protection (e2e)；EN: Test group: CSRF protection (e2e).
describe('CSRF protection (e2e)', () => {
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
              NODE_ENV: 'test',
              CSRF_ENABLED: true,
              CSRF_SECRET: 'test-csrf-secret',
              COOKIE_SECRET: 'test-cookie-secret',
            }),
          ],
        }),
        CommonCsrfModule,
        DemoCsrfModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test-cookie-secret'));
    app.use(
      session({
        secret: 'test-session-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );
    app.use(app.get(CsrfService).createProtectionMiddleware());
    app.use(app.get(CsrfService).createErrorHandler());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    await app?.close();
  });

  // CN: 测试用例：rejects unsafe browser mutations until the client sends the issued CSRF token；EN: Test case: rejects unsafe browser mutations until the client sends the issued CSRF token.
  it('rejects unsafe browser mutations until the client sends the issued CSRF token', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/demo-csrf/transfer-preview')
      .send({ recipient: 'alice@example.com', amount: 25 })
      .expect(403)
      .expect({
        statusCode: 403,
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token',
      });

    const tokenResponse = await agent.get('/demo-csrf/token').expect(200);
    const tokenBody = tokenResponse.body as CsrfTokenResponseBody;

    expect(typeof tokenBody.csrfToken).toBe('string');
    expect(tokenBody.headerName).toBe('x-csrf-token');

    await agent
      .post('/demo-csrf/transfer-preview')
      .set(tokenBody.headerName, tokenBody.csrfToken)
      .send({ recipient: 'alice@example.com', amount: 25 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          accepted: true,
          protectedBy: 'csrf-csrf',
          recipient: 'alice@example.com',
          amount: 25,
        });
      });
  });
});
