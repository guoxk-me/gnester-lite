import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { io, type Socket as ClientSocket } from 'socket.io-client';

import { AuthTokenService } from '../src/platform/security/auth/auth-token.service';
import { CommonAuthModule } from '../src/platform/security/auth/auth.module';
import { CommonRateLimitModule } from '../src/platform/security/rate-limit/rate-limit.module';
import { SocketIoAdapter } from '../src/bootstrap/http/socket-io.adapter';
import { DemoWebsocketModule } from '../src/examples/demo-websocket/demo-websocket.module';

interface HttpServerAddress {
  address(): AddressInfo | string | null;
}

const SOCKET_TIMEOUT_MS = 5_000;
const NEGATIVE_EVENT_WINDOW_MS = 300;
const TRUSTED_BROWSER_ORIGIN = 'https://trusted.example';

jest.setTimeout(15_000);

describe('DemoWebsocketGateway (e2e)', () => {
  let app: INestApplication | undefined;
  let baseUrl: string;
  let authTokenService: AuthTokenService;
  const clients: ClientSocket[] = [];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              rateLimit: {
                enabled: true,
                trustProxy: 'loopback',
                errorMessage: 'Too many requests',
                throttlers: [
                  {
                    name: 'custom-test-budget',
                    ttl: 1000,
                    limit: 100,
                  },
                ],
              },
            }),
          ],
        }),
        CommonAuthModule,
        // AI modified: exercise the production global HTTP guard with real WS messages.
        CommonRateLimitModule,
        DemoWebsocketModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(
      new SocketIoAdapter(app, {
        origin: [TRUSTED_BROWSER_ORIGIN],
        credentials: true,
      }),
    );
    await app.listen(0);

    const address = (app.getHttpServer() as HttpServerAddress).address();

    if (!address || typeof address === 'string') {
      throw new Error('Nest test server did not expose a TCP address.');
    }

    baseUrl = `http://127.0.0.1:${address.port}/demo-websocket`;
    authTokenService = app.get(AuthTokenService);
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }

    await app?.close();
  });

  it('rejects anonymous websocket clients during connection setup', async () => {
    const client = connectClient();

    await expect(
      onceClientEvent<{
        readonly code: string;
        readonly message: string;
      }>(client, 'demo-websocket.error'),
    ).resolves.toEqual({
      code: 'WEBSOCKET_UNAUTHORIZED',
      message: 'Unauthorized websocket connection',
    });
  });

  it('accepts a JWT-authenticated client and emits pong for ping messages', async () => {
    const token = await authTokenService.signAccessToken({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
    const client = connectClient({ token });

    await onceClientEvent(client, 'connect');
    const pongPromise = onceClientEvent<{
      readonly userId: string;
      readonly username: string;
      readonly message: string;
    }>(client, 'demo-websocket.pong');
    const interceptedPromise = onceClientEvent<{
      readonly event: string;
      readonly socketId: string;
      readonly userId: string;
    }>(client, 'demo-websocket.intercepted');

    client.emit('demo-websocket.ping', {
      message: 'alive',
    });

    await expect(pongPromise).resolves.toEqual({
      userId: 'demo-admin',
      username: 'admin@example.com',
      message: 'alive',
    });
    await expect(interceptedPromise).resolves.toEqual({
      event: 'demo-websocket.pong',
      socketId: expect.any(String) as unknown,
      userId: 'demo-admin',
    });
  });

  it('accepts a trusted browser Origin and rejects a hostile Origin', async () => {
    const token = await authTokenService.signAccessToken({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
    const trustedClient = connectClient({
      token,
      origin: TRUSTED_BROWSER_ORIGIN,
    });

    await expect(onceClientEvent(trustedClient, 'connect')).resolves.toBe(
      undefined,
    );
    const hostileClient = connectClient({
      token,
      origin: 'https://hostile.example',
    });
    await expect(onceClientEvent(hostileClient, 'connect')).rejects.toThrow();
  });

  it('emits a stable websocket exception event for invalid message payloads', async () => {
    const token = await authTokenService.signAccessToken({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
    const client = connectClient({ token });

    await onceClientEvent(client, 'connect');
    const exceptionPromise = onceClientEvent<{
      readonly code: string;
      readonly message: string;
      readonly errors: readonly {
        readonly field: string;
        readonly reason: string;
      }[];
    }>(client, 'demo-websocket.exception');

    client.emit('demo-websocket.room.join', {
      room: 'invalid room with spaces',
    });

    await expect(exceptionPromise).resolves.toEqual({
      code: 'WEBSOCKET_VALIDATION_FAILED',
      message: 'Validation failed',
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'room',
        }),
      ]) as unknown,
    });
  });

  it('requires senders to join a room before broadcasting', async () => {
    const token = await authTokenService.signAccessToken({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
    const sender = connectClient({ token });
    const receiver = connectClient({ token });

    await Promise.all([
      onceClientEvent(sender, 'connect'),
      onceClientEvent(receiver, 'connect'),
    ]);
    const receiverJoinedPromise = onceClientEvent(
      receiver,
      'demo-websocket.room.joined',
    );
    receiver.emit('demo-websocket.room.join', {
      room: 'private-room',
    });
    await receiverJoinedPromise;

    const membershipExceptionPromise = onceClientEvent<{
      readonly code: string;
      readonly message: string;
    }>(sender, 'demo-websocket.exception');
    const noUnauthorizedBroadcast = expectNoClientEvent(
      receiver,
      'demo-websocket.message',
    );
    sender.emit('demo-websocket.message', {
      room: 'private-room',
      message: 'unauthorized',
    });

    await expect(membershipExceptionPromise).resolves.toEqual({
      code: 'WEBSOCKET_ROOM_MEMBERSHIP_REQUIRED',
      message: 'Join the room before sending messages',
    });
    await noUnauthorizedBroadcast;

    const senderJoinedPromise = onceClientEvent(
      sender,
      'demo-websocket.room.joined',
    );
    sender.emit('demo-websocket.room.join', {
      room: 'private-room',
    });
    await senderJoinedPromise;

    const authorizedBroadcastPromise = onceClientEvent<{
      readonly room: string;
      readonly message: string;
    }>(receiver, 'demo-websocket.message');
    sender.emit('demo-websocket.message', {
      room: 'private-room',
      message: 'authorized',
    });

    await expect(authorizedBroadcastPromise).resolves.toMatchObject({
      room: 'private-room',
      message: 'authorized',
    });
  });

  function connectClient(
    options: { readonly token?: string; readonly origin?: string } = {},
  ): ClientSocket {
    const client = io(baseUrl, {
      auth: options.token ? { token: options.token } : undefined,
      ...(options.origin
        ? {
            extraHeaders: {
              Origin: options.origin,
            },
          }
        : {}),
      forceNew: true,
      reconnection: false,
      timeout: SOCKET_TIMEOUT_MS,
      transports: ['websocket'],
    });

    clients.push(client);

    return client;
  }
});

function onceClientEvent<T = void>(
  client: ClientSocket,
  eventName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, SOCKET_TIMEOUT_MS);

    const onEvent = (payload: T): void => {
      cleanup();
      resolve(payload);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      client.off(eventName, onEvent);
      client.off('connect_error', onError);
    };

    client.once(eventName, onEvent);
    client.once('connect_error', onError);
  });
}

function expectNoClientEvent(
  client: ClientSocket,
  eventName: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onUnexpectedEvent = (): void => {
      cleanup();
      reject(new Error(`Unexpected ${eventName} event`));
    };
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, NEGATIVE_EVENT_WINDOW_MS);
    const cleanup = (): void => {
      clearTimeout(timeout);
      client.off(eventName, onUnexpectedEvent);
    };

    client.once(eventName, onUnexpectedEvent);
  });
}
