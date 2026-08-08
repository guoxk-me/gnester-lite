import type { Server } from 'node:http';

import { Test } from '@nestjs/testing';
import request from 'supertest';

import { DemoCookiesController } from './demo-cookies/demo-cookies.controller';
import { DemoCookiesService } from './demo-cookies/demo-cookies.service';
import { DemoCorsController } from './demo-cors/demo-cors.controller';
import { DemoCorsService } from './demo-cors/demo-cors.service';
import { DemoSessionController } from './demo-session/demo-session.controller';
import { DemoSessionService } from './demo-session/demo-session.service';

describe('personalized response cache policy', () => {
  it.each([
    '/demo-session',
    '/demo-session/flash',
    '/demo-session/cart',
    '/demo-cookies',
    '/demo-cookies/demo_preferences',
    '/demo-cors/credentialed-resource',
  ])('marks %s as private and non-storable', async (path) => {
    const testingModule = await Test.createTestingModule({
      controllers: [
        DemoSessionController,
        DemoCookiesController,
        DemoCorsController,
      ],
      providers: [
        {
          provide: DemoSessionService,
          useValue: {
            getStatus: () => ({}),
            consumeFlashMessages: () => ({ consumed: 0, messages: [] }),
            getCart: () => [],
          },
        },
        {
          provide: DemoCookiesService,
          useValue: {
            read: () => ({ found: false, value: null }),
          },
        },
        {
          provide: DemoCorsService,
          useValue: {
            getCredentialedResource: () => ({
              id: 'credentialed-profile',
              visibility: 'credentialed',
              hasSession: false,
              corsRequirement: 'Use explicit origins with credentials.',
            }),
          },
        },
      ],
    }).compile();
    const app = testingModule.createNestApplication();

    await app.init();
    const httpServer = app.getHttpServer() as Server;

    try {
      await request(httpServer)
        .get(path)
        .expect('Cache-Control', 'private, no-store')
        .expect(200);
    } finally {
      await app.close();
    }
  });
});
