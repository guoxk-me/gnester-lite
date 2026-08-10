import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthTokenService } from '../../platform/security/auth/auth-token.service';
import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import {
  DEMO_WEBSOCKET_EVENTS,
  type DemoWebsocketEventName,
} from './demo-websocket.constants';
import { DemoWebsocketPingDto } from './dto/demo-websocket-ping.dto';
import { DemoWebsocketScenarioDto } from './dto/demo-websocket-scenario.dto';

interface DemoWebsocketConnectionSnapshot {
  readonly socketId: string;
  readonly userId: string;
  readonly username: string;
}

interface DemoWebsocketEvent<
  EventName extends DemoWebsocketEventName,
  EventPayload,
> {
  readonly event: EventName;
  readonly data: EventPayload;
}

@Injectable()
export class DemoWebsocketService {
  private readonly connections = new Map<string, JwtAuthenticatedUser>();

  constructor(private readonly authTokenService: AuthTokenService) {}

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
        eventName: DEMO_WEBSOCKET_EVENTS.Ping,
        direction: 'client-to-server',
        useCase:
          'Let clients verify that the authenticated socket is still usable.',
        nestPattern:
          'Use @SubscribeMessage() and return an event/data acknowledgement.',
      },
      {
        name: 'Room subscription',
        eventName: DEMO_WEBSOCKET_EVENTS.RoomJoin,
        direction: 'client-to-server',
        useCase: 'Subscribe a socket to a named room for scoped broadcasts.',
        nestPattern: 'Use @ConnectedSocket() and Socket.IO client.join(room).',
      },
      {
        name: 'Room broadcast',
        eventName: DEMO_WEBSOCKET_EVENTS.RoomMessage,
        direction: 'server-to-client',
        useCase:
          'Broadcast validated messages to every client in a Socket.IO room.',
        nestPattern: 'Use @WebSocketServer() and server.to(room).emit().',
      },
    ];
  }

  async verifyAccessToken(
    token: string | undefined,
  ): Promise<JwtAuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // AI modified: WebSocket handshakes use the canonical HTTP JWT verifier.
      return await this.authTokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException();
    }
  }

  registerConnection(socketId: string, user: JwtAuthenticatedUser): void {
    this.connections.set(socketId, user);
  }

  removeConnection(socketId: string): void {
    this.connections.delete(socketId);
  }

  getConnectionSnapshot(): DemoWebsocketConnectionSnapshot[] {
    return [...this.connections.entries()].map(([socketId, user]) => ({
      socketId,
      userId: user.sub,
      username: user.username,
    }));
  }

  createPong(
    dto: DemoWebsocketPingDto,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<
    typeof DEMO_WEBSOCKET_EVENTS.Pong,
    {
      readonly userId: string;
      readonly username: string;
      readonly message: string;
    }
  > {
    return {
      event: DEMO_WEBSOCKET_EVENTS.Pong,
      data: {
        userId: user.sub,
        username: user.username,
        message: dto.message ?? 'pong',
      },
    };
  }

  createRoomJoined(
    room: string,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<
    typeof DEMO_WEBSOCKET_EVENTS.RoomJoined,
    {
      readonly room: string;
      readonly userId: string;
      readonly username: string;
    }
  > {
    return {
      event: DEMO_WEBSOCKET_EVENTS.RoomJoined,
      data: {
        room,
        userId: user.sub,
        username: user.username,
      },
    };
  }

  createRoomMessage(
    room: string,
    message: string,
    user: JwtAuthenticatedUser,
  ): DemoWebsocketEvent<
    typeof DEMO_WEBSOCKET_EVENTS.RoomMessage,
    {
      readonly room: string;
      readonly userId: string;
      readonly username: string;
      readonly message: string;
    }
  > {
    return {
      event: DEMO_WEBSOCKET_EVENTS.RoomMessage,
      data: {
        room,
        userId: user.sub,
        username: user.username,
        message,
      },
    };
  }
}
