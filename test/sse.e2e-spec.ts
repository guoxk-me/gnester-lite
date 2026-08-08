import type { INestApplication, MessageEvent } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { DemoSseController } from '../src/examples/demo-sse/demo-sse.controller';
import { DemoSseService } from '../src/examples/demo-sse/demo-sse.service';

describe('SSE response contract (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    const heartbeat: MessageEvent = {
      type: 'heartbeat',
      data: { status: 'ok' },
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DemoSseController],
      providers: [
        {
          provide: DemoSseService,
          useValue: {
            streamHeartbeat: () => of(heartbeat),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('publishes the documented cache and proxy buffering headers', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    // AI modified: assert the adapter-level headers because Nest finalizes SSE headers after the controller runs.
    await request(app.getHttpServer())
      .get('/demo-sse/heartbeat')
      .set('Accept', 'text/event-stream')
      .expect(200)
      .expect('Content-Type', /text\/event-stream/)
      .expect(
        'Cache-Control',
        'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
      )
      .expect('X-Accel-Buffering', 'no');
  });
});
