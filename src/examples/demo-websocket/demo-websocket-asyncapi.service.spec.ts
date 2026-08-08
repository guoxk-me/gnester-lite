import { DiagnosticSeverity, Parser } from '@asyncapi/parser';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import yaml from 'js-yaml';
import request from 'supertest';

import { DemoWebsocketAsyncApiController } from './demo-websocket-asyncapi.controller';
import {
  createDemoWebsocketAsyncApiDocument,
  DemoWebsocketAsyncApiService,
} from './demo-websocket-asyncapi.service';
import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';

describe('DemoWebsocketAsyncApiService', () => {
  it('produces a valid AsyncAPI 3 document', async () => {
    const parser = new Parser();
    const diagnostics = await parser.validate(
      yaml.dump(createDemoWebsocketAsyncApiDocument(4310)),
    );
    const errors = diagnostics.filter(
      (diagnostic) =>
        Number(diagnostic.severity) === Number(DiagnosticSeverity.Error),
    );

    expect(errors).toEqual([]);
  });

  it('uses the runtime event inventory and preserves response schemas', () => {
    const document = createDemoWebsocketAsyncApiDocument(4310);
    const channelAddresses = Object.values(document.channels).map(
      (documentedChannel) => documentedChannel.address,
    );

    expect(document.servers.local).toEqual({
      host: 'localhost:4310',
      pathname: '/socket.io/',
      protocol: 'socket.io',
      description:
        'Socket.IO Engine.IO endpoint for the /demo-websocket namespace.',
      'x-socket-io-namespace': '/demo-websocket',
      security: [{ $ref: '#/components/securitySchemes/bearer' }],
    });
    expect(new Set(channelAddresses)).toEqual(
      new Set(Object.values(DEMO_WEBSOCKET_EVENTS)),
    );
    expect(channelAddresses).not.toContain('demo-websocket.error.detail');
    expect(document.channels.handshakeError.address).toBe(
      DEMO_WEBSOCKET_EVENTS.HandshakeError,
    );
    expect(document.channels.exception.address).toBe(
      DEMO_WEBSOCKET_EVENTS.Exception,
    );
    expect(document.channels.scenarios.messages.request).toEqual({
      name: 'DemoWebsocketScenariosRequest',
    });
    expect(document.channels.scenarios.messages.request).not.toHaveProperty(
      'payload',
    );
    expect(document.operations.receiveScenarios).toMatchObject({
      messages: [{ $ref: '#/channels/scenarios/messages/request' }],
    });
    expect(document.components.schemas.DemoWebsocketScenariosResponse).toEqual({
      type: 'array',
      items: {
        $ref: '#/components/schemas/DemoWebsocketScenario',
      },
    });
    expect(document.components.schemas.DemoWebsocketException).toMatchObject({
      properties: {
        errors: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/DemoWebsocketErrorDetail',
          },
        },
      },
    });
    expect(document.components.schemas.DemoWebsocketPing).toMatchObject({
      properties: {
        message: {
          type: 'string',
          minLength: 1,
          maxLength: 120,
          pattern: '\\S',
        },
      },
    });
    expect(document.components.schemas.DemoWebsocketRoomMessage).toMatchObject({
      properties: {
        message: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
          pattern: '\\S',
        },
      },
    });
    expect(document.operations.receiveRoomMessage).toMatchObject({
      'x-room-membership-required': true,
    });
    expect(document.operations.receiveRoomMessage.description).toContain(
      DEMO_WEBSOCKET_EVENTS.Exception,
    );
    expect(
      document.components.schemas.DemoWebsocketHandshakeError,
    ).toMatchObject({
      properties: {
        code: {
          enum: ['WEBSOCKET_UNAUTHORIZED'],
        },
      },
    });
    expect(
      document.components.schemas.DemoWebsocketHandshakeError.description,
    ).toContain('handshake');
    expect(
      document.components.schemas.DemoWebsocketException.description,
    ).toContain('room-membership');
  });

  it('fails closed when port zero has no assigned HTTP listener', () => {
    const service = new DemoWebsocketAsyncApiService(
      {
        get: jest.fn().mockReturnValue(0),
      } as unknown as ConfigService,
      {
        httpAdapter: {
          getHttpServer: () => ({
            address: () => null,
          }),
        },
      } as unknown as HttpAdapterHost,
    );

    expect(() => service.getDocument()).toThrow(ServiceUnavailableException);
    expect(() => createDemoWebsocketAsyncApiDocument(0)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('serves import endpoints through Nest routing', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DemoWebsocketAsyncApiController],
      providers: [
        DemoWebsocketAsyncApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback: unknown) => fallback),
          },
        },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();

    await app.init();
    const httpServer = app.getHttpServer() as Server;

    try {
      await request(httpServer)
        .get('/async-api')
        .expect(200)
        .expect('Content-Type', /text\/html/);
      await request(httpServer)
        .get('/async-api-json')
        .expect(200)
        .expect((response) => {
          expect(response.text).toContain('"asyncapi":"3.0.0"');
        });
      await request(httpServer)
        .get('/async-api-yaml')
        .expect(200)
        .expect('Content-Type', /text\/yaml/);
    } finally {
      await app.close();
    }
  });

  it('publishes the assigned listener port when configured with port zero', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DemoWebsocketAsyncApiController],
      providers: [
        DemoWebsocketAsyncApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback: unknown) =>
              key === 'PORT' ? 0 : fallback,
            ),
          },
        },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();

    await app.listen(0, '127.0.0.1');
    const httpServer = app.getHttpServer() as Server;
    const listeningPort = getListeningPort(httpServer);

    try {
      await request(httpServer)
        .get('/async-api-json')
        .expect(200)
        .expect((response) => {
          expect(response.text).toContain(
            `"host":"localhost:${listeningPort}"`,
          );
          expect(response.text).not.toContain('"host":"localhost:0"');
        });
    } finally {
      await app.close();
    }
  });
});

function getListeningPort(server: Server): number {
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected the test HTTP server to use a TCP listener.');
  }

  return address.port;
}
