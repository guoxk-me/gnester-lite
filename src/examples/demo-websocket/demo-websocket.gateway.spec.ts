import { UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { MAX_BEARER_TOKEN_LENGTH } from '../../platform/security/auth/bearer-token';
import {
  DemoWebsocketGateway,
  type DemoWebsocketSocket,
} from './demo-websocket.gateway';
import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
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
  connected: boolean;
  rooms: Set<string>;
};

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

  beforeEach(() => {
    jest.resetAllMocks();
    gateway = new DemoWebsocketGateway(
      service as unknown as DemoWebsocketService,
    );
    serverTo = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });
    gateway.server = {
      to: serverTo,
    } as unknown as Server;
  });

  it('disconnects unauthenticated clients during the websocket handshake', async () => {
    const client = createClient({ token: undefined });
    service.verifyAccessToken.mockRejectedValueOnce(
      new UnauthorizedException(),
    );

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(client.emit).toHaveBeenCalledWith(
      DEMO_WEBSOCKET_EVENTS.HandshakeError,
      {
        code: 'WEBSOCKET_UNAUTHORIZED',
        message: 'Unauthorized websocket connection',
      },
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(service.registerConnection).not.toHaveBeenCalled();
  });

  it('rejects oversized auth tokens before JWT verification', async () => {
    const client = createClient({
      token: 'a'.repeat(MAX_BEARER_TOKEN_LENGTH + 1),
    });

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(service.verifyAccessToken).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects oversized authorization header tokens before JWT verification', async () => {
    const client = createClient({
      authorization: `Bearer ${'a'.repeat(MAX_BEARER_TOKEN_LENGTH + 1)}`,
    });

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(service.verifyAccessToken).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('stores authenticated user context and registers accepted clients', async () => {
    const client = createClient({ token: 'valid.jwt' });
    service.verifyAccessToken.mockResolvedValueOnce(user);

    await gateway.handleConnection(client as unknown as DemoWebsocketSocket);

    expect(client.data.user).toEqual(user);
    expect(service.registerConnection).toHaveBeenCalledWith('socket-1', user);
  });

  it('does not register a client that disconnects while JWT verification is pending', async () => {
    let resolveVerification:
      | ((authenticatedUser: typeof user) => void)
      | undefined;
    const client = createClient({ token: 'valid.jwt' });
    service.verifyAccessToken.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveVerification = resolve;
      }),
    );

    const pendingConnection = gateway.handleConnection(
      client as unknown as DemoWebsocketSocket,
    );
    client.connected = false;
    resolveVerification?.(user);
    await pendingConnection;

    expect(service.registerConnection).not.toHaveBeenCalled();
  });

  it('returns a pong event that includes the authenticated user context', () => {
    const client = createClient({ user });
    const pong = {
      event: DEMO_WEBSOCKET_EVENTS.Pong,
      data: {
        userId: 'demo-admin',
        username: 'admin@example.com',
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
      event: DEMO_WEBSOCKET_EVENTS.Scenarios,
      data: scenarios,
    });
  });

  it('joins a named room and returns the room membership acknowledgement', async () => {
    const client = createClient({ user });
    const ack = {
      event: DEMO_WEBSOCKET_EVENTS.RoomJoined,
      data: {
        room: 'demo-room',
        userId: 'demo-admin',
        username: 'admin@example.com',
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

  it('broadcasts room messages through the socket server namespace', () => {
    const client = createClient({ user, rooms: ['demo-room'] });
    const roomMessage = {
      event: DEMO_WEBSOCKET_EVENTS.RoomMessage,
      data: {
        room: 'demo-room',
        userId: 'demo-admin',
        username: 'admin@example.com',
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
      DEMO_WEBSOCKET_EVENTS.RoomMessage,
      roomMessage.data,
    );
  });

  it('rejects broadcasts to rooms the socket has not joined', () => {
    const client = createClient({ user });

    try {
      gateway.handleRoomMessage(
        {
          room: 'private-room',
          message: 'hello',
        },
        client as unknown as DemoWebsocketSocket,
      );
      throw new Error('Expected room membership check to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        code: 'WEBSOCKET_ROOM_MEMBERSHIP_REQUIRED',
        message: 'Join the room before sending messages',
      });
    }

    expect(service.createRoomMessage).not.toHaveBeenCalled();
    expect(serverTo).not.toHaveBeenCalled();
  });

  it('removes connection state when clients disconnect', () => {
    gateway.handleDisconnect(
      createClient({ id: 'socket-2' }) as unknown as DemoWebsocketSocket,
    );

    expect(service.removeConnection).toHaveBeenCalledWith('socket-2');
  });
});

function createClient(options: {
  readonly id?: string;
  readonly token?: string;
  readonly authorization?: string;
  readonly user?: unknown;
  readonly rooms?: readonly string[];
}): TestSocket {
  const socketId = options.id ?? 'socket-1';

  return {
    id: socketId,
    data: {
      ...(options.user ? { user: options.user } : {}),
    },
    handshake: {
      auth: {
        ...(options.token ? { token: options.token } : {}),
      },
      headers: {
        ...(options.authorization
          ? { authorization: options.authorization }
          : {}),
      },
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
    connected: true,
    rooms: new Set([socketId, ...(options.rooms ?? [])]),
  } as unknown as TestSocket;
}
