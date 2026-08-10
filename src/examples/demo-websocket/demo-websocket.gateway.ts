import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import {
  extractBearerToken,
  MAX_BEARER_TOKEN_LENGTH,
} from '../../platform/security/auth/bearer-token';
import {
  DEMO_WEBSOCKET_EVENTS,
  DEMO_WEBSOCKET_NAMESPACE,
} from './demo-websocket.constants';
import { DemoWebsocketPingDto } from './dto/demo-websocket-ping.dto';
import { DemoWebsocketRoomDto } from './dto/demo-websocket-room.dto';
import { DemoWebsocketRoomMessageDto } from './dto/demo-websocket-room-message.dto';
import { DemoWebsocketScenarioDto } from './dto/demo-websocket-scenario.dto';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard';
import { DemoWebsocketExceptionFilter } from './demo-websocket-exception.filter';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor';
import { createDemoWebsocketValidationPipe } from './demo-websocket-validation.pipe';
import { DemoWebsocketService } from './demo-websocket.service';

export type DemoWebsocketSocket = Omit<Socket, 'data'> & {
  readonly data: {
    user?: JwtAuthenticatedUser;
  };
};

@WebSocketGateway({
  namespace: DEMO_WEBSOCKET_NAMESPACE,
})
@UseFilters(new DemoWebsocketExceptionFilter())
@UseGuards(DemoWebsocketAuthenticatedGuard)
@UseInterceptors(DemoWebsocketResponseInterceptor)
@UsePipes(createDemoWebsocketValidationPipe())
export class DemoWebsocketGateway
  implements
    OnGatewayConnection<DemoWebsocketSocket>,
    OnGatewayDisconnect<DemoWebsocketSocket>
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly demoWebsocketService: DemoWebsocketService) {}

  async handleConnection(client: DemoWebsocketSocket): Promise<void> {
    try {
      const token = this.extractAccessToken(client);

      if (!token) {
        throw new Error('Websocket access token is missing or malformed.');
      }

      const user = await this.demoWebsocketService.verifyAccessToken(token);

      // AI modified: an async JWT result must not resurrect state for a socket that disconnected meanwhile.
      if (client.connected === false) {
        return;
      }

      client.data.user = user;
      this.demoWebsocketService.registerConnection(client.id, user);
    } catch {
      client.emit(DEMO_WEBSOCKET_EVENTS.HandshakeError, {
        code: 'WEBSOCKET_UNAUTHORIZED',
        message: 'Unauthorized websocket connection',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: DemoWebsocketSocket): void {
    this.demoWebsocketService.removeConnection(client.id);
  }

  @SubscribeMessage(DEMO_WEBSOCKET_EVENTS.Scenarios)
  handleScenarios(): {
    readonly event: typeof DEMO_WEBSOCKET_EVENTS.Scenarios;
    readonly data: DemoWebsocketScenarioDto[];
  } {
    return {
      event: DEMO_WEBSOCKET_EVENTS.Scenarios,
      data: this.demoWebsocketService.listScenarios(),
    };
  }

  @SubscribeMessage(DEMO_WEBSOCKET_EVENTS.Ping)
  handlePing(
    @MessageBody() dto: DemoWebsocketPingDto,
    @ConnectedSocket() client: DemoWebsocketSocket,
  ): ReturnType<DemoWebsocketService['createPong']> {
    return this.demoWebsocketService.createPong(dto, this.getUser(client));
  }

  @SubscribeMessage(DEMO_WEBSOCKET_EVENTS.RoomJoin)
  async handleJoinRoom(
    @MessageBody() dto: DemoWebsocketRoomDto,
    @ConnectedSocket() client: DemoWebsocketSocket,
  ): Promise<ReturnType<DemoWebsocketService['createRoomJoined']>> {
    await client.join(dto.room);

    return this.demoWebsocketService.createRoomJoined(
      dto.room,
      this.getUser(client),
    );
  }

  @SubscribeMessage(DEMO_WEBSOCKET_EVENTS.RoomMessage)
  handleRoomMessage(
    @MessageBody() dto: DemoWebsocketRoomMessageDto,
    @ConnectedSocket() client: DemoWebsocketSocket,
  ): {
    readonly event: typeof DEMO_WEBSOCKET_EVENTS.MessageAccepted;
    readonly data: {
      readonly room: string;
    };
  } {
    if (!client.rooms.has(dto.room)) {
      throw new WsException({
        code: 'WEBSOCKET_ROOM_MEMBERSHIP_REQUIRED',
        message: 'Join the room before sending messages',
      });
    }

    const roomMessage = this.demoWebsocketService.createRoomMessage(
      dto.room,
      dto.message,
      this.getUser(client),
    );

    this.server.to(dto.room).emit(roomMessage.event, roomMessage.data);

    return {
      event: DEMO_WEBSOCKET_EVENTS.MessageAccepted,
      data: {
        room: dto.room,
      },
    };
  }

  private extractAccessToken(client: DemoWebsocketSocket): string | undefined {
    const auth = client.handshake.auth as unknown;

    if (
      isRecord(auth) &&
      typeof auth.token === 'string' &&
      auth.token.length > 0 &&
      auth.token.length <= MAX_BEARER_TOKEN_LENGTH &&
      !/\s/.test(auth.token)
    ) {
      return auth.token;
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization !== 'string') {
      return undefined;
    }

    return extractBearerToken(authorization);
  }

  private getUser(client: DemoWebsocketSocket): JwtAuthenticatedUser {
    const { user } = client.data;

    if (!user) {
      throw new Error('Authenticated websocket user is missing.');
    }

    return user;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
