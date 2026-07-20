// CN: 端到端测试，验证 application e2e 的真实应用流程；EN: E2E test verifies real application flows for application e2e.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { DemoAuthModule } from '../src/features/demo-auth/demo-auth.module';

interface LoginResponseBody {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

// CN: 测试分组：AppController (e2e)；EN: Test group: AppController (e2e).
describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
        }),
        DemoAuthModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    await app?.close();
  });

  // CN: 测试用例：/ (GET)；EN: Test case: / (GET).
  it('/ (GET)', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // CN: 测试用例：/demo-auth/profile (GET) rejects anonymous requests；EN: Test case: /demo-auth/profile (GET) rejects anonymous requests.
  it('/demo-auth/profile (GET) rejects anonymous requests', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    return request(app.getHttpServer()).get('/demo-auth/profile').expect(401);
  });

  // CN: 测试用例：/demo-auth/login (POST) issues a token for the protected profile route；EN: Test case: /demo-auth/login (POST) issues a token for the protected profile route.
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
});
