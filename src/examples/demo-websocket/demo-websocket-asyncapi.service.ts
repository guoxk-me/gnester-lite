import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import yaml from 'js-yaml';

import {
  DEMO_WEBSOCKET_EVENTS,
  DEMO_WEBSOCKET_NAMESPACE,
} from './demo-websocket.constants';

interface AsyncApiMessage {
  readonly name: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

interface AsyncApiChannel {
  readonly address: string;
  readonly messages: Readonly<Record<string, AsyncApiMessage>>;
}

export interface DemoWebsocketAsyncApiDocument {
  readonly asyncapi: '3.0.0';
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly defaultContentType: 'application/json';
  readonly servers: Readonly<Record<string, unknown>>;
  readonly channels: Readonly<Record<string, AsyncApiChannel>>;
  readonly operations: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  readonly components: {
    readonly securitySchemes: Readonly<Record<string, unknown>>;
    readonly schemas: Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >;
  };
}

const asyncApiIndex = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>gnester-lite WebSocket API</title>
  </head>
  <body>
    <main>
      <h1>gnester-lite WebSocket API</h1>
      <p>Import the maintained AsyncAPI contract using one of these endpoints:</p>
      <ul>
        <li><a href="/async-api-json">AsyncAPI JSON</a></li>
        <li><a href="/async-api-yaml">AsyncAPI YAML</a></li>
      </ul>
    </main>
  </body>
</html>`;

export function createDemoWebsocketAsyncApiDocument(
  port: number,
): DemoWebsocketAsyncApiDocument {
  if (!isTcpPort(port)) {
    throw new ServiceUnavailableException(
      'AsyncAPI server address is unavailable.',
    );
  }

  const channels = {
    scenarios: {
      address: DEMO_WEBSOCKET_EVENTS.Scenarios,
      messages: {
        // AI modified: an explicit payload-free message prevents AsyncAPI from treating the response as valid request input.
        request: {
          name: 'DemoWebsocketScenariosRequest',
        },
        response: {
          name: 'DemoWebsocketScenariosResponse',
          payload: {
            $ref: '#/components/schemas/DemoWebsocketScenariosResponse',
          },
        },
      },
    },
    ping: {
      address: DEMO_WEBSOCKET_EVENTS.Ping,
      messages: {
        request: {
          name: 'DemoWebsocketPing',
          payload: { $ref: '#/components/schemas/DemoWebsocketPing' },
        },
      },
    },
    pong: {
      address: DEMO_WEBSOCKET_EVENTS.Pong,
      messages: {
        response: {
          name: 'DemoWebsocketPong',
          payload: { $ref: '#/components/schemas/DemoWebsocketPong' },
        },
      },
    },
    roomJoin: {
      address: DEMO_WEBSOCKET_EVENTS.RoomJoin,
      messages: {
        request: {
          name: 'DemoWebsocketRoomJoin',
          payload: { $ref: '#/components/schemas/DemoWebsocketRoomJoin' },
        },
      },
    },
    roomJoined: {
      address: DEMO_WEBSOCKET_EVENTS.RoomJoined,
      messages: {
        response: {
          name: 'DemoWebsocketRoomJoined',
          payload: { $ref: '#/components/schemas/DemoWebsocketRoomJoined' },
        },
      },
    },
    roomMessage: {
      address: DEMO_WEBSOCKET_EVENTS.RoomMessage,
      messages: {
        request: {
          name: 'DemoWebsocketRoomMessage',
          payload: { $ref: '#/components/schemas/DemoWebsocketRoomMessage' },
        },
        broadcast: {
          name: 'DemoWebsocketRoomBroadcast',
          payload: {
            $ref: '#/components/schemas/DemoWebsocketRoomBroadcast',
          },
        },
      },
    },
    messageAccepted: {
      address: DEMO_WEBSOCKET_EVENTS.MessageAccepted,
      messages: {
        response: {
          name: 'DemoWebsocketMessageAccepted',
          payload: {
            $ref: '#/components/schemas/DemoWebsocketMessageAccepted',
          },
        },
      },
    },
    // AI modified: handshake rejection and handler exceptions are separate client contracts.
    handshakeError: {
      address: DEMO_WEBSOCKET_EVENTS.HandshakeError,
      messages: {
        response: {
          name: 'DemoWebsocketHandshakeError',
          payload: {
            $ref: '#/components/schemas/DemoWebsocketHandshakeError',
          },
        },
      },
    },
    exception: {
      address: DEMO_WEBSOCKET_EVENTS.Exception,
      messages: {
        response: {
          name: 'DemoWebsocketException',
          payload: { $ref: '#/components/schemas/DemoWebsocketException' },
        },
      },
    },
    intercepted: {
      address: DEMO_WEBSOCKET_EVENTS.Intercepted,
      messages: {
        response: {
          name: 'DemoWebsocketIntercepted',
          payload: { $ref: '#/components/schemas/DemoWebsocketIntercepted' },
        },
      },
    },
  } satisfies Record<string, AsyncApiChannel>;

  return {
    asyncapi: '3.0.0',
    info: {
      title: 'gnester-lite WebSocket API',
      version: '1.0.0',
      description:
        'Socket.IO contract for the authenticated /demo-websocket namespace.',
    },
    defaultContentType: 'application/json',
    servers: {
      local: {
        host: `localhost:${port}`,
        pathname: '/socket.io/',
        protocol: 'socket.io',
        description:
          'Socket.IO Engine.IO endpoint for the /demo-websocket namespace.',
        'x-socket-io-namespace': `/${DEMO_WEBSOCKET_NAMESPACE}`,
        security: [{ $ref: '#/components/securitySchemes/bearer' }],
      },
    },
    channels,
    operations: {
      receiveScenarios: {
        action: 'receive',
        channel: { $ref: '#/channels/scenarios' },
        messages: [{ $ref: '#/channels/scenarios/messages/request' }],
      },
      sendScenarios: {
        action: 'send',
        channel: { $ref: '#/channels/scenarios' },
        messages: [{ $ref: '#/channels/scenarios/messages/response' }],
      },
      receivePing: {
        action: 'receive',
        channel: { $ref: '#/channels/ping' },
        messages: [{ $ref: '#/channels/ping/messages/request' }],
      },
      sendPong: {
        action: 'send',
        channel: { $ref: '#/channels/pong' },
        messages: [{ $ref: '#/channels/pong/messages/response' }],
      },
      receiveRoomJoin: {
        action: 'receive',
        channel: { $ref: '#/channels/roomJoin' },
        messages: [{ $ref: '#/channels/roomJoin/messages/request' }],
      },
      sendRoomJoined: {
        action: 'send',
        channel: { $ref: '#/channels/roomJoined' },
        messages: [{ $ref: '#/channels/roomJoined/messages/response' }],
      },
      receiveRoomMessage: {
        action: 'receive',
        description: `The sending socket must join the target room before publishing. Failures are sent on ${DEMO_WEBSOCKET_EVENTS.Exception}.`,
        'x-room-membership-required': true,
        channel: { $ref: '#/channels/roomMessage' },
        messages: [{ $ref: '#/channels/roomMessage/messages/request' }],
      },
      sendRoomBroadcast: {
        action: 'send',
        channel: { $ref: '#/channels/roomMessage' },
        messages: [{ $ref: '#/channels/roomMessage/messages/broadcast' }],
      },
      sendMessageAccepted: {
        action: 'send',
        channel: { $ref: '#/channels/messageAccepted' },
        messages: [{ $ref: '#/channels/messageAccepted/messages/response' }],
      },
      sendHandshakeError: {
        action: 'send',
        channel: { $ref: '#/channels/handshakeError' },
        messages: [{ $ref: '#/channels/handshakeError/messages/response' }],
      },
      sendException: {
        action: 'send',
        channel: { $ref: '#/channels/exception' },
        messages: [{ $ref: '#/channels/exception/messages/response' }],
      },
      sendIntercepted: {
        action: 'send',
        channel: { $ref: '#/channels/intercepted' },
        messages: [{ $ref: '#/channels/intercepted/messages/response' }],
      },
    },
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        DemoWebsocketScenariosResponse: {
          type: 'array',
          items: { $ref: '#/components/schemas/DemoWebsocketScenario' },
        },
        DemoWebsocketScenario: {
          type: 'object',
          additionalProperties: false,
          required: [
            'name',
            'eventName',
            'direction',
            'useCase',
            'nestPattern',
          ],
          properties: {
            name: { type: 'string' },
            eventName: { type: 'string' },
            direction: {
              type: 'string',
              enum: ['client-to-server', 'server-to-client'],
            },
            useCase: { type: 'string' },
            nestPattern: { type: 'string' },
          },
        },
        DemoWebsocketPing: {
          type: 'object',
          additionalProperties: false,
          properties: {
            // AI modified: keep the hand-maintained AsyncAPI schema aligned with runtime validation.
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
              pattern: '\\S',
            },
          },
        },
        DemoWebsocketPong: {
          type: 'object',
          additionalProperties: false,
          required: ['userId', 'username', 'message'],
          properties: {
            userId: { type: 'string' },
            username: { type: 'string' },
            message: { type: 'string' },
          },
        },
        DemoWebsocketRoomJoin: {
          $ref: '#/components/schemas/DemoWebsocketRoom',
        },
        DemoWebsocketRoom: {
          type: 'object',
          additionalProperties: false,
          required: ['room'],
          properties: {
            room: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              pattern: '^[a-zA-Z0-9:_-]+$',
            },
          },
        },
        DemoWebsocketRoomJoined: {
          type: 'object',
          additionalProperties: false,
          required: ['room', 'userId', 'username'],
          properties: {
            room: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
          },
        },
        DemoWebsocketRoomMessage: {
          type: 'object',
          additionalProperties: false,
          required: ['room', 'message'],
          properties: {
            room: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              pattern: '^[a-zA-Z0-9:_-]+$',
            },
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              pattern: '\\S',
            },
          },
        },
        DemoWebsocketRoomBroadcast: {
          type: 'object',
          additionalProperties: false,
          required: ['room', 'userId', 'username', 'message'],
          properties: {
            room: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            message: { type: 'string' },
          },
        },
        DemoWebsocketMessageAccepted: {
          type: 'object',
          additionalProperties: false,
          required: ['room'],
          properties: {
            room: { type: 'string' },
          },
        },
        DemoWebsocketHandshakeError: {
          type: 'object',
          additionalProperties: false,
          description:
            'Authentication failure emitted during the Socket.IO handshake before disconnecting the client.',
          required: ['code', 'message'],
          properties: {
            code: {
              type: 'string',
              enum: ['WEBSOCKET_UNAUTHORIZED'],
            },
            message: {
              type: 'string',
              description:
                'Safe authentication failure message for the rejected handshake.',
            },
          },
        },
        DemoWebsocketErrorDetail: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'reason'],
          properties: {
            field: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        DemoWebsocketException: {
          type: 'object',
          additionalProperties: false,
          description:
            'Handler, guard, validation, and room-membership failures emitted by the websocket exception filter.',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/DemoWebsocketErrorDetail',
              },
            },
          },
        },
        DemoWebsocketIntercepted: {
          type: 'object',
          additionalProperties: false,
          required: ['event', 'socketId', 'userId'],
          properties: {
            event: { type: 'string' },
            socketId: { type: 'string' },
            userId: { type: ['string', 'null'] },
          },
        },
      },
    },
  };
}

@Injectable()
export class DemoWebsocketAsyncApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  getDocument(): DemoWebsocketAsyncApiDocument {
    const port = this.resolveServerPort();

    return createDemoWebsocketAsyncApiDocument(port);
  }

  getYaml(): string {
    return yaml.dump(this.getDocument());
  }

  getIndex(): string {
    return asyncApiIndex;
  }

  private resolveServerPort(): number {
    const configuredPort = this.configService.get<number>('PORT', 3000);

    if (configuredPort !== 0) {
      return configuredPort;
    }

    // AI modified: port zero must advertise the assigned listener, never localhost:0.
    const httpServer =
      this.httpAdapterHost.httpAdapter.getHttpServer() as unknown;

    if (!hasAddressMethod(httpServer)) {
      throw new ServiceUnavailableException(
        'AsyncAPI server address is unavailable.',
      );
    }

    const address = httpServer.address();

    if (!isRecord(address) || !isTcpPort(address.port)) {
      throw new ServiceUnavailableException(
        'AsyncAPI server address is unavailable.',
      );
    }

    return address.port;
  }
}

function hasAddressMethod(
  value: unknown,
): value is { readonly address: () => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'address' in value &&
    typeof value.address === 'function'
  );
}

function isTcpPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65_535
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
