import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';

import { DemoCookiesModule } from '../src/examples/demo-cookies/demo-cookies.module';

describe('Cookies (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
        }),
        DemoCookiesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // AI modified: reproduce the real no-secret cookie-parser path used by the default application.
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('clears the signed demo cookie when COOKIE_SECRET is absent', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const response = await request(app.getHttpServer())
      .delete('/demo-cookies/session')
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'demo_session',
      action: 'clear',
      signed: true,
    });
    expect(response.headers['set-cookie']?.[0]).toContain(
      'demo_session=; Path=/demo-cookies',
    );
  });
});
