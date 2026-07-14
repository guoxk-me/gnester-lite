// CN: 服务，承载 demo-websocket 的业务逻辑；EN: Service holds business logic for demo-websocket.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import { DemoWebsocketPingDto } from './dto/demo-websocket-ping.dto';
import { DemoWebsocketScenarioDto } from './dto/demo-websocket-scenario.dto';

interface DemoWebsocketConnectionSnapshot {
  readonly socketId: string;
  readonly userId: string;
  readonly username: string;
}

interface DemoWebsocketEvent<TData> {
  readonly event: string;
  readonly data: TData;
}

@Injectable()
export class DemoWebsocketService {
  private readonly connections = new Map<string, JwtAuthenticatedUser>();

  // CN: 初始化 demo-websocket 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-websocket.
  constructor(private readonly jwtService: JwtService) {}

  // CN: 执行 demo-websocket 的 list scenarios 业务逻辑；EN: Runs the list scenarios business logic for demo-websocket.
  listScenarios(): DemoWebsocketScenarioDto[] {
    return [
      {
        name: 'Authenticated socket handshake',
        eventName: 'connection',
        direction: 'client-to-server',
        useCase:
          'Verify a JWT before accepting a long-lived websocket connection.',
        nestPattern:
          'Use OnGatewayConnection to validate Socket.IO handshake auth.',
      },
      {
        name: 'Ping/pong health check',
        eventName: 'demo-websocket.ping',
        direction: 'client-to-server',
        useCase:
          'Let clients verify that the authenticated socket is still usable.',
        nestPattern:
          'Use @SubscribeMessage() and return an event/data acknowledgement.',
      },
      {
        name: 'Room subscription',
        eventName: 'demo-websocket.room.join',
        direction: 'client-to-server',
        useCase: 'Subscribe a socket to a named room for scoped broadcasts.',
        nestPattern: 'Use @ConnectedSocket() and Socket.IO client.join(room).',
      },
      {
        name: 'Room broadcast',
        eventName: 'demo-websocket.message',
        direction: 'server-to-client',
        useCase:
          'Broadcast validated messages to every client in a Socket.IO room.',
        nestPattern: 'Use @WebSocketServer() and server.to(room).emit().',
      },
    ];
  }

  // CN: 执行 demo-websocket 的 verify access token 业务逻辑；EN: Runs the verify access token business logic for demo-websocket.
  async verifyAccessToken(
    token: string | undefined,
  ): Promise<JwtAuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      return await this.jwtService.verifyAsync<JwtAuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException();
    }
  }

  // CN: 执行 demo-websocket 的 register connection 业务逻辑；EN: Runs the register connection business logic for demo-websocket.
  registerConnection(socketId: string, user: JwtAuthenticatedUser): void {
    this.connections.set(socketId, user);
  }

  // CN: 执行 demo-websocket 的 remove connection 业务逻辑；EN: Runs the remove connection business logic for demo-websocket.
  removeConnection(socketId: string): void {
    this.connections.delete(socketId);
  }

  // CN: 执行 demo-websocket 的 get connection snapshot 业务逻辑；EN: Runs the get connection snapshot business logic for demo-websocket.
  getConnectionSnapshot(): DemoWebsocketConnectionSnapshot[] {
    return [...this.connections.entries()].map(([socketId, user]) => ({
      socketId,
      userId: user.sub,
      username: user.username,
    }));
  }

  // CN: 执行 demo-websocket 的 create pong 业务逻辑；EN: Runs the create pong business logic for demo-websocket.
  createPong(
    dto: DemoWebsocketPingDto,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<{
    readonly userId: string;
    readonly username: string;
    readonly message: string;
  }> {
    return {
      event: 'demo-websocket.pong',
      data: {
        userId: user.sub,
        username: user.username,
        message: dto.message ?? 'pong',
      },
    };
  }

  // CN: 执行 demo-websocket 的 create room joined 业务逻辑；EN: Runs the create room joined business logic for demo-websocket.
  createRoomJoined(
    room: string,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<{
    readonly room: string;
    readonly userId: string;
    readonly username: string;
  }> {
    return {
      event: 'demo-websocket.room.joined',
      data: {
        room,
        userId: user.sub,
        username: user.username,
      },
    };
  }

  // CN: 执行 demo-websocket 的 create room message 业务逻辑；EN: Runs the create room message business logic for demo-websocket.
  createRoomMessage(
    room: string,
    message: string,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<{
    readonly room: string;
    readonly userId: string;
    readonly username: string;
    readonly message: string;
  }> {
    return {
      event: 'demo-websocket.message',
      data: {
        room,
        userId: user.sub,
        username: user.username,
        message,
      },
    };
  }
}
