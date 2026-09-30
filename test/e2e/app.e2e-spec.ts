import { ConfigModule } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../../src/app.controller.js';
import { AppService } from '../../src/app.service.js';
import { HttpResponseModule } from '../../src/infra/http/http-response.module.js';

// AI modified: landing and localized protocol checks use retained production controllers after Demo removal.
describe('application HTTP contract (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          isGlobal: true,
        }),
        HttpResponseModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns the English landing envelope', async () => {
    await request(app.getHttpServer()).get('/').expect(200, {
      code: 200,
      message: 'Success',
      data: 'Hello World!',
      errors: null,
    });
  });
  it('negotiates Chinese and declares cache variation', async () => {
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
  it('localizes framework missing-route responses', async () => {
    await request(app.getHttpServer())
      .get('/missing-route')
      .set('Accept-Language', 'zh')
      .expect(404, { code: 404, message: '未找到', data: null, errors: null });
  });
  it('does not expose the removed Demo catalog', async () => {
    await request(app.getHttpServer())
      .get('/api/demo-auth/profile')
      .expect(404);
  });
});
