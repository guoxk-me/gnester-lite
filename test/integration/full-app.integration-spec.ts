import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CacheService } from '../../src/infra/cache/cache.service.js';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ASSISTANT_QUEUE } from '../../src/modules/assistant/assistant-generation.service.js';

// AI modified: guarded integration exercises the retained product graph with real MySQL/Redis, without provider APIs.
describe('full application infrastructure', () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    await configureApplication(app);
    await app.listen(0, '127.0.0.1');
  }, 30000);
  afterAll(async () => {
    await app?.close();
  });
  it('boots the application and keeps probes native', async () => {
    await request(app.getHttpServer()).get('/v1').expect(200, {
      code: 200,
      message: 'Success',
      data: 'Hello World!',
      errors: null,
    });
    await request(app.getHttpServer())
      .get('/api/health/live')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body).not.toHaveProperty('code');
      });
    await request(app.getHttpServer()).get('/api/health/ready').expect(200);
    await request(app.getHttpServer()).get('/api/session').expect(401);
    await request(app.getHttpServer())
      .get('/api/assistant/conversations')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/demo-auth/profile')
      .expect(404);
  });
  it('uses the migrated application tables and the owned Redis cache', async () => {
    const database = app.get(DataSource);
    const tables = await database.query<{ tableName: string }[]>(
      'SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    expect(tables.map(({ tableName }) => tableName)).toEqual(
      expect.arrayContaining([
        'user',
        'account',
        'session',
        'assistant_conversation',
        'assistant_key',
      ]),
    );
    const cache = app.get(CacheService);
    const key = `integration:${process.pid}:${Date.now()}`;
    try {
      await cache.set(key, { ok: true });
      expect(await cache.get(key)).toEqual({ ok: true });
    } finally {
      await cache.del(key);
    }
  });
  it('registers the assistant queue without invoking a model provider', async () => {
    const queue = app.get<Queue>(getQueueToken(ASSISTANT_QUEUE));
    await expect(queue.waitUntilReady()).resolves.toBeDefined();
    expect(await queue.getJobCounts('waiting', 'active')).toHaveProperty(
      'waiting',
    );
  });
});
