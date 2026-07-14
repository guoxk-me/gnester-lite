// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import { UnauthorizedException } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  DemoWebsocketGateway,
  type DemoWebsocketSocket,
} from './demo-websocket.gateway';
import { DemoWebsocketService } from './demo-websocket.service';

type TestSocket = Omit<
  DemoWebsocketSocket,
  'data' | 'emit' | 'disconnect' | 'join'
> & {
  data: {
    user?: unknown;
  };
  emit: jest.Mock;
  disconnect: jest.Mock;
  join: jest.Mock;
};

// CN: 测试分组：DemoWebsocketGateway；EN: Test group: DemoWebsocketGateway.
describe('DemoWebsocketGateway', () => {
  const user = {
    sub: 'demo-admin',
    username: 'admin@example.com',
    roles: ['admin'],
  };
  const service: jest.Mocked<
    Pick<
      DemoWebsocketService,
      | 'listScenarios'
      | 'verifyAccessToken'
      | 'registerConnection'
      | 'removeConnection'
      | 'createPong'
      | 'createRoomJoined'
      | 'createRoomMessage'
    >
  > = {
    listScenarios: jest.fn(),
    verifyAccessToken: jest.fn(),
    registerConnection: jest.fn(),
    removeConnection: jest.fn(),
    createPong: jest.fn(),
    createRoomJoined: jest.fn(),
    createRoomMessage: jest.fn(),
  };
  let gateway: DemoWebsocketGateway;
  let serverTo: jest.Mock;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new DemoWebsocketGateway(service as DemoWebsocketService);
    serverTo = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });
    gateway.server = {
      to: serverTo,
    } as unknown as Server;
  });

  // CN: 测试用例：disconnects unauthenticated clients during the websocket handshake；EN: Test case: disconnects unauthenticated clients during the websocket handshake.
  it('disconnects unauthenticated clients during the websocket handshake', async () => {
    const client = createClient({ token: undefined });
    service.verifyAccessToken.mockRejectedValueOnce(
      new UnauthorizedException(),
    );

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(client.emit).toHaveBeenCalledWith('demo-websocket.error', {
      code: 'WEBSOCKET_UNAUTHORIZED',
      message: 'Unauthorized websocket connection',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(service.registerConnection).not.toHaveBeenCalled();
  });

  // CN: 测试用例：stores authenticated user context and registers accepted clients；EN: Test case: stores authenticated user context and registers accepted clients.
  it('stores authenticated user context and registers accepted clients', async () => {
    const client = createClient({ token: 'valid.jwt' });
    service.verifyAccessToken.mockResolvedValueOnce(user);

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(client.data.user).toEqual(user);
    expect(service.registerConnection).toHaveBeenCalledWith('socket-1', user);
  });

  // CN: 测试用例：returns a pong event that includes the authenticated user context；EN: Test case: returns a pong event that includes the authenticated user context.
  it('returns a pong event that includes the authenticated user context', () => {
    const client = createClient({ user });
    const pong = {
      event: 'demo-websocket.pong',
      data: {
        userId: 'demo-admin',
        message: 'alive',
      },
    };
    service.createPong.mockReturnValueOnce(pong);

    expect(
      gateway.handlePing(
        { message: 'alive' },
        client as unknown as DemoWebsocketSocket,
      ),
    ).toEqual(pong);
    expect(service.createPong).toHaveBeenCalledWith({ message: 'alive' }, user);
  });

  // CN: 测试用例：returns documented websocket scenarios over a socket event；EN: Test case: returns documented websocket scenarios over a socket event.
  it('returns documented websocket scenarios over a socket event', () => {
    const scenarios = [
      {
        name: 'Ping/pong health check',
        eventName: 'demo-websocket.ping',
        direction: 'client-to-server' as const,
        useCase: 'verify socket liveness',
        nestPattern: '@SubscribeMessage() handles client events',
      },
    ];
    service.listScenarios.mockReturnValueOnce(scenarios);

    expect(gateway.handleScenarios()).toEqual({
      event: 'demo-websocket.scenarios',
      data: scenarios,
    });
  });

  // CN: 测试用例：joins a named room and returns the room membership acknowledgement；EN: Test case: joins a named room and returns the room membership acknowledgement.
  it('joins a named room and returns the room membership acknowledgement', async () => {
    const client = createClient({ user });
    const ack = {
      event: 'demo-websocket.room.joined',
      data: {
        room: 'demo-room',
        userId: 'demo-admin',
      },
    };
    service.createRoomJoined.mockReturnValueOnce(ack);

    await expect(
      gateway.handleJoinRoom(
        { room: 'demo-room' },
        client as unknown as DemoWebsocketSocket,
      ),
    ).resolves.toEqual(ack);

    expect(client.join).toHaveBeenCalledWith('demo-room');
    expect(service.createRoomJoined).toHaveBeenCalledWith('demo-room', user);
  });

  // CN: 测试用例：broadcasts room messages through the socket server namespace；EN: Test case: broadcasts room messages through the socket server namespace.
  it('broadcasts room messages through the socket server namespace', () => {
    const client = createClient({ user });
    const roomMessage = {
      event: 'demo-websocket.message',
      data: {
        room: 'demo-room',
        userId: 'demo-admin',
        message: 'hello',
      },
    };
    const roomServer = {
      emit: jest.fn(),
    };
    serverTo.mockReturnValueOnce(roomServer);
    service.createRoomMessage.mockReturnValueOnce(roomMessage);

    expect(
      gateway.handleRoomMessage(
        {
          room: 'demo-room',
          message: 'hello',
        },
        client as unknown as DemoWebsocketSocket,
      ),
    ).toEqual({
      event: 'demo-websocket.message.accepted',
      data: {
        room: 'demo-room',
      },
    });
    expect(serverTo).toHaveBeenCalledWith('demo-room');
    expect(roomServer.emit).toHaveBeenCalledWith(
      'demo-websocket.message',
      roomMessage.data,
    );
  });

  // CN: 测试用例：removes connection state when clients disconnect；EN: Test case: removes connection state when clients disconnect.
  it('removes connection state when clients disconnect', () => {
    gateway.handleDisconnect(
      createClient({ id: 'socket-2' }) as unknown as DemoWebsocketSocket,
    );

    expect(service.removeConnection).toHaveBeenCalledWith('socket-2');
  });
});

// CN: 准备或验证 demo-websocket 的 create client 测试逻辑；EN: Prepares or verifies the create client test logic for demo-websocket.
function createClient(options: {
  readonly id?: string;
  readonly token?: string;
  readonly user?: unknown;
}): TestSocket {
  return {
    id: options.id ?? 'socket-1',
    data: {
      ...(options.user ? { user: options.user } : {}),
    },
    handshake: {
      auth: {
        ...(options.token ? { token: options.token } : {}),
      },
      headers: {},
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
  } as unknown as TestSocket;
}
