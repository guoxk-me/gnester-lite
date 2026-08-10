import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { configureApplication } from '../src/bootstrap/configure-application';
import { CommonCsrfModule } from '../src/platform/security/csrf/csrf.module';
import { DemoCsrfModule } from '../src/examples/demo-csrf/demo-csrf.module';
import { betterAuthTestProvider } from './better-auth.stub';

interface CsrfTokenResponseBody {
  csrfToken: string;
  headerName: string;
}

describe('CSRF protection (e2e)', () => {
  let app: NestExpressApplication | undefined;

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
              rateLimit: {
                trustProxy: false,
              },
            }),
          ],
        }),
        CommonCsrfModule,
        DemoCsrfModule,
      ],
      providers: [betterAuthTestProvider],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    // AI modified: exercise the same order-sensitive bootstrap pipeline used by production.
    await configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

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
        code: 403,
        message: 'Invalid CSRF token',
        data: null,
        errors: null,
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
