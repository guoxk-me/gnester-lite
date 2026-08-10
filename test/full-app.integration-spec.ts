import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Queue, QueueEvents } from 'bullmq';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import type { ApiEnvelope } from '../src/contracts/api-envelope';
import { CacheService } from '../src/platform/infrastructure/cache/cache.service';
import { getQueueWorkerConnectionOptions } from '../src/platform/infrastructure/queue/queue-connection';
import type { AccessTokenDto } from '../src/examples/demo-auth/dto/access-token.dto';
import type { DemoAuthProfileDto } from '../src/examples/demo-auth/dto/demo-auth-profile.dto';
import { DemoCacheService } from '../src/examples/demo-cache/demo-cache.service';
import { DEMO_QUEUE } from '../src/examples/demo-queue/demo-queue.constants';
import { DemoQueueService } from '../src/examples/demo-queue/demo-queue.service';
import { Demo } from '../src/examples/demo-database/entities/demo.entity';

interface DemoWebsocketPong {
  readonly userId: string;
  readonly username: string;
  readonly message: string;
}

describe('full application infrastructure', () => {
  let app: INestApplication | undefined;
  let baseUrl: string;
  let httpServer: Server;
  let queueEvents: QueueEvents | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const expressApp = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    // AI modified: publish ownership before bootstrap so afterAll closes partial initialization.
    app = expressApp;

    await configureApplication(expressApp);
    await expressApp.listen(0, '127.0.0.1');

    httpServer = expressApp.getHttpServer();
    const address = httpServer.address();

    if (!address || typeof address === 'string') {
      throw new Error('Expected the integration server to use a TCP port.');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;

    const configService = expressApp.get(ConfigService);
    queueEvents = new QueueEvents(DEMO_QUEUE, {
      connection: getQueueWorkerConnectionOptions(
        configService.getOrThrow<string>('REDIS_URL'),
      ),
      prefix: `${configService.getOrThrow<string>('queue.prefix')}:${configService.getOrThrow<string>('NODE_ENV')}`,
    });
    await queueEvents.waitUntilReady();
  }, 30_000);

  afterAll(async () => {
    // AI modified: attempt every owned-resource cleanup even when one close operation fails.
    const cleanupOutcomes = await Promise.allSettled([
      queueEvents?.close() ?? Promise.resolve(),
      app?.close() ?? Promise.resolve(),
    ]);
    queueEvents = undefined;
    app = undefined;

    const cleanupFailures: unknown[] = [];

    for (const cleanupOutcome of cleanupOutcomes) {
      if (cleanupOutcome.status === 'rejected') {
        cleanupFailures.push(cleanupOutcome.reason as unknown);
      }
    }

    if (cleanupFailures.length > 0) {
      throw new AggregateError(
        cleanupFailures,
        'Full application integration cleanup failed.',
      );
    }
  });

  it('boots AppModule against migrated MySQL and real Redis services', async () => {
    if (!app || !queueEvents) {
      throw new Error('The full application did not finish bootstrapping.');
    }

    // AI modified: exercise the localized wire envelope while leaving probe contracts raw.
    await request(httpServer).get('/v1').expect(200, {
      code: 200,
      message: 'Success',
      data: 'Hello World!',
      errors: null,
    });
    await request(httpServer)
      .get('/v1')
      .set('Accept-Language', 'zh-CN, zh;q=0.9, en;q=0.8')
      .expect(200, {
        code: 200,
        message: '成功',
        data: '你好，世界！',
        errors: null,
      });
    await request(httpServer)
      .get('/health/live')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('status', 'ok');
        expect(body).not.toHaveProperty('code');
      });
    await request(httpServer).get('/health/ready').expect(200);
    await request(httpServer)
      .get('/demo-auth/profile')
      .set('Accept-Language', 'zh-CN')
      .expect(401, {
        code: 401,
        message: '未授权',
        data: null,
        errors: null,
      });

    const loginResponse = await request(httpServer)
      .post('/demo-auth/login')
      .send({
        username: 'admin@example.com',
        password: 'admin12345',
      })
      .expect(200);
    const loginEnvelope = loginResponse.body as ApiEnvelope<AccessTokenDto>;
    const accessToken = loginEnvelope.data?.accessToken;

    if (!accessToken) {
      throw new Error('Demo login did not return an access token envelope.');
    }

    await request(httpServer)
      .get('/demo-auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const profileEnvelope =
          response.body as ApiEnvelope<DemoAuthProfileDto>;

        expect(profileEnvelope.data).toMatchObject({
          sub: 'demo-admin',
          username: 'admin@example.com',
        });
      });

    const demoRepository = app.get<Repository<Demo>>(getRepositoryToken(Demo));
    const persistedDemo = await demoRepository.save({
      name: `ci-${Date.now()}`.slice(0, 20),
      description: 'full application integration',
    });

    try {
      await expect(
        demoRepository.findOneByOrFail({ id: persistedDemo.id }),
      ).resolves.toMatchObject({
        description: 'full application integration',
      });
    } finally {
      await demoRepository.delete(persistedDemo.id);
    }

    const searchSuffix = Date.now().toString(36);
    const literalSearchName = `literal!%_${searchSuffix}`;
    const wildcardDecoyName = `literal!ab${searchSuffix}`;
    const searchDemos = await demoRepository.save([
      {
        name: literalSearchName,
        description: 'literal LIKE search target',
      },
      {
        name: wildcardDecoyName,
        description: 'wildcard search decoy',
      },
    ]);

    try {
      // AI modified: execute against MySQL so `%`, `_`, and the custom escape stay literal beyond query-builder mocks.
      await request(httpServer)
        .get('/demo-database/search')
        .query({ keyword: '!%_' })
        .expect(200)
        .expect((response) => {
          const searchEnvelope = response.body as ApiEnvelope<Demo[]>;

          expect(searchEnvelope.data).toContainEqual(
            expect.objectContaining({ name: literalSearchName }),
          );
          expect(searchEnvelope.data).not.toContainEqual(
            expect.objectContaining({ name: wildcardDecoyName }),
          );
        });
    } finally {
      await demoRepository.delete(searchDemos.map((demo) => demo.id));
    }

    const cacheService = app.get(CacheService);
    const demoCacheService = app.get(DemoCacheService);
    const cacheKey = `full-app-${Date.now()}`;

    await cacheService.ping();
    let shouldRemoveCacheEntry = false;

    try {
      await demoCacheService.create({ key: cacheKey, value: 'redis-backed' });
      shouldRemoveCacheEntry = true;
      await expect(demoCacheService.findAll()).resolves.toContainEqual({
        key: cacheKey,
        value: 'redis-backed',
      });
      await expect(
        demoCacheService.update(cacheKey, { value: 'redis-updated' }),
      ).resolves.toEqual({
        key: cacheKey,
        value: 'redis-updated',
      });
      await demoCacheService.remove(cacheKey);
      shouldRemoveCacheEntry = false;
      await expect(demoCacheService.findAll()).resolves.not.toContainEqual(
        expect.objectContaining({ key: cacheKey }),
      );
    } finally {
      // AI modified: do not leave the integration cache key behind after an assertion failure.
      if (shouldRemoveCacheEntry) {
        await demoCacheService.remove(cacheKey);
      }
    }

    const queueService = app.get(DemoQueueService);
    const demoQueue = app.get<Queue>(getQueueToken(DEMO_QUEUE));
    const integrationQueueJobIds: string[] = [];
    let hasQueueExecutionFailed = false;
    let queueExecutionFailure: unknown;

    try {
      const enqueuedEmailJob = await queueService.enqueueEmail({
        to: 'integration@example.com',
        subject: 'Full application integration',
      });

      if (!enqueuedEmailJob.id) {
        throw new Error('Enqueued email job did not receive an id.');
      }
      integrationQueueJobIds.push(enqueuedEmailJob.id);
      const emailJob = await demoQueue.getJob(enqueuedEmailJob.id);

      if (!emailJob) {
        throw new Error(
          `Enqueued email job ${enqueuedEmailJob.id} was not found.`,
        );
      }

      await expect(
        emailJob.waitUntilFinished(queueEvents, 10_000),
      ).resolves.toMatchObject({
        delivered: true,
      });
      await expect(queueService.getStatus()).resolves.toMatchObject({
        enabled: true,
        queue: 'demo',
      });

      const enqueuedWorkflowJob = await queueService.enqueueSubtaskWorkflow({
        workflowName: `full-app-${Date.now()}`,
        subtasks: [{ name: 'redis-worker', durationMs: 500 }],
      });

      if (!enqueuedWorkflowJob.id) {
        throw new Error('Enqueued workflow job did not receive an id.');
      }
      integrationQueueJobIds.push(enqueuedWorkflowJob.id);
      const workflowJob = await demoQueue.getJob(enqueuedWorkflowJob.id);

      if (!workflowJob) {
        throw new Error(
          `Enqueued workflow job ${enqueuedWorkflowJob.id} was not found.`,
        );
      }

      await expect(
        workflowJob.waitUntilFinished(queueEvents, 10_000),
      ).resolves.toMatchObject({
        workflowCompleted: true,
      });
    } catch (error) {
      hasQueueExecutionFailed = true;
      queueExecutionFailure = error;
    }

    // AI modified: remove only jobs created by this test, including workflow children.
    const queueCleanupOutcomes = await Promise.allSettled(
      integrationQueueJobIds.map(async (queueJobId) => {
        const queuedRecord = await demoQueue.getJob(queueJobId);
        await queuedRecord?.remove({ removeChildren: true });
      }),
    );
    const queueFailures: unknown[] = [];

    if (hasQueueExecutionFailed) {
      queueFailures.push(queueExecutionFailure);
    }

    for (const cleanupOutcome of queueCleanupOutcomes) {
      if (cleanupOutcome.status === 'rejected') {
        queueFailures.push(cleanupOutcome.reason as unknown);
      }
    }

    if (queueFailures.length > 0) {
      throw new AggregateError(
        queueFailures,
        'Full application queue verification or cleanup failed.',
      );
    }

    const websocket = io(`${baseUrl}/demo-websocket`, {
      auth: { token: accessToken },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });

    try {
      await waitForSocketEvent(websocket, 'connect');
      const pongPromise = waitForSocketEvent<DemoWebsocketPong>(
        websocket,
        'demo-websocket.pong',
      );

      websocket.emit('demo-websocket.ping', { message: 'integration' });

      await expect(pongPromise).resolves.toMatchObject({
        userId: 'demo-admin',
        username: 'admin@example.com',
        message: 'integration',
      });
    } finally {
      websocket.disconnect();
    }
  }, 30_000);
});

function waitForSocketEvent<T = void>(
  socket: Socket,
  eventName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handleConnectError = (error: Error): void => {
      removeListeners();
      reject(error);
    };
    const handleEvent = (event: T): void => {
      removeListeners();
      resolve(event);
    };
    const timeout = setTimeout(() => {
      removeListeners();
      reject(new Error(`Timed out waiting for Socket.IO event "${eventName}"`));
    }, 5_000);

    // AI modified: remove the losing listener on every settlement path.
    const removeListeners = (): void => {
      clearTimeout(timeout);
      socket.off('connect_error', handleConnectError);
      socket.off(eventName, handleEvent);
    };

    socket.once('connect_error', handleConnectError);
    socket.once(eventName, handleEvent);
  });
}
