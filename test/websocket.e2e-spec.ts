// CN: 端到端测试，验证 application e2e 的真实应用流程；EN: E2E test verifies real application flows for application e2e.
import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { io, type Socket as ClientSocket } from 'socket.io-client';

import { AuthTokenService } from '../src/common/auth/auth-token.service';
import { CommonAuthModule } from '../src/common/auth/auth.module';
import { DemoSocketIoAdapter } from '../src/common/websocket/demo-socket-io.adapter';
import { DemoWebsocketModule } from '../src/features/demo-websocket/demo-websocket.module';

interface HttpServerAddress {
  address(): AddressInfo | string | null;
}

// CN: 测试分组：DemoWebsocketGateway (e2e)；EN: Test group: DemoWebsocketGateway (e2e).
describe('DemoWebsocketGateway (e2e)', () => {
  let app: INestApplication | undefined;
  let baseUrl: string;
  let authTokenService: AuthTokenService;
  const clients: ClientSocket[] = [];

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
        }),
        CommonAuthModule,
        DemoWebsocketModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new DemoSocketIoAdapter(app));
    await app.listen(0);

    const address = (app.getHttpServer() as HttpServerAddress).address();

    if (!address || typeof address === 'string') {
      throw new Error('Nest test server did not expose a TCP address.');
    }

    baseUrl = `http://127.0.0.1:${address.port}/demo-websocket`;
    authTokenService = app.get(AuthTokenService);
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }

    await app?.close();
  });

  // CN: 测试用例：rejects anonymous websocket clients during connection setup；EN: Test case: rejects anonymous websocket clients during connection setup.
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

  // CN: 测试用例：accepts a JWT-authenticated client and emits pong for ping messages；EN: Test case: accepts a JWT-authenticated client and emits pong for ping messages.
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

  // CN: 测试用例：emits a stable websocket exception event for invalid message payloads；EN: Test case: emits a stable websocket exception event for invalid message payloads.
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

  // CN: 准备或验证 e2e flow 的 connect client 测试逻辑；EN: Prepares or verifies the connect client test logic for e2e flow.
  function connectClient(
    options: { readonly token?: string } = {},
  ): ClientSocket {
    const client = io(baseUrl, {
      auth: options.token ? { token: options.token } : undefined,
      forceNew: true,
      reconnection: false,
      timeout: 1000,
      transports: ['websocket'],
    });

    clients.push(client);

    return client;
  }
});

// CN: 准备或验证 e2e flow 的 once client event 测试逻辑；EN: Prepares or verifies the once client event test logic for e2e flow.
function onceClientEvent<T = void>(
  client: ClientSocket,
  eventName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, 1500);

    // CN: 准备或验证 e2e flow 的 on event 测试逻辑；EN: Prepares or verifies the on event test logic for e2e flow.
    const onEvent = (payload: T): void => {
      cleanup();
      resolve(payload);
    };
    // CN: 准备或验证 e2e flow 的 on error 测试逻辑；EN: Prepares or verifies the on error test logic for e2e flow.
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    // CN: 准备或验证 e2e flow 的 cleanup 测试逻辑；EN: Prepares or verifies the cleanup test logic for e2e flow.
    const cleanup = (): void => {
      clearTimeout(timeout);
      client.off(eventName, onEvent);
      client.off('connect_error', onError);
    };

    client.once(eventName, onEvent);
    client.once('connect_error', onError);
  });
}
