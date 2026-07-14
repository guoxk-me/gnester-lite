// CN: 网关，定义 demo-websocket 的实时通信入口；EN: Gateway defines real-time communication entry points for demo-websocket.
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConnectedSocket, MessageBody } from '@nestjs/websockets';
import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
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
  namespace: 'demo-websocket',
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

  // CN: 初始化 demo-websocket 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-websocket.
  constructor(private readonly demoWebsocketService: DemoWebsocketService) {}

  // CN: 处理 demo-websocket 的 handle connection 实时消息；EN: Handles the handle connection real-time message for demo-websocket.
  async handleConnection(client: DemoWebsocketSocket): Promise<void> {
    try {
      const user = await this.demoWebsocketService.verifyAccessToken(
        this.extractAccessToken(client),
      );

      client.data.user = user;
      this.demoWebsocketService.registerConnection(client.id, user);
    } catch {
      client.emit('demo-websocket.error', {
        code: 'WEBSOCKET_UNAUTHORIZED',
        message: 'Unauthorized websocket connection',
      });
      client.disconnect(true);
    }
  }

  // CN: 处理 demo-websocket 的 handle disconnect 实时消息；EN: Handles the handle disconnect real-time message for demo-websocket.
  handleDisconnect(client: DemoWebsocketSocket): void {
    this.demoWebsocketService.removeConnection(client.id);
  }

  // CN: 处理 demo-websocket 的 handle scenarios 实时消息；EN: Handles the handle scenarios real-time message for demo-websocket.
  @SubscribeMessage('demo-websocket.scenarios')
  handleScenarios(): {
    readonly event: 'demo-websocket.scenarios';
    readonly data: DemoWebsocketScenarioDto[];
  } {
    return {
      event: 'demo-websocket.scenarios',
      data: this.demoWebsocketService.listScenarios(),
    };
  }

  // CN: 处理 demo-websocket 的 handle ping 实时消息；EN: Handles the handle ping real-time message for demo-websocket.
  @SubscribeMessage('demo-websocket.ping')
  handlePing(
    @MessageBody() dto: DemoWebsocketPingDto,
    @ConnectedSocket() client: DemoWebsocketSocket,
  ): ReturnType<DemoWebsocketService['createPong']> {
    return this.demoWebsocketService.createPong(dto, this.getUser(client));
  }

  // CN: 处理 demo-websocket 的 handle join room 实时消息；EN: Handles the handle join room real-time message for demo-websocket.
  @SubscribeMessage('demo-websocket.room.join')
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

  // CN: 处理 demo-websocket 的 handle room message 实时消息；EN: Handles the handle room message real-time message for demo-websocket.
  @SubscribeMessage('demo-websocket.message')
  handleRoomMessage(
    @MessageBody() dto: DemoWebsocketRoomMessageDto,
    @ConnectedSocket() client: DemoWebsocketSocket,
  ): {
    readonly event: 'demo-websocket.message.accepted';
    readonly data: {
      readonly room: string;
    };
  } {
    const roomMessage = this.demoWebsocketService.createRoomMessage(
      dto.room,
      dto.message,
      this.getUser(client),
    );

    this.server.to(dto.room).emit(roomMessage.event, roomMessage.data);

    return {
      event: 'demo-websocket.message.accepted',
      data: {
        room: dto.room,
      },
    };
  }

  // CN: 处理 demo-websocket 的 extract access token 实时消息；EN: Handles the extract access token real-time message for demo-websocket.
  private extractAccessToken(client: DemoWebsocketSocket): string | undefined {
    const auth = client.handshake.auth as unknown;

    if (isRecord(auth) && typeof auth.token === 'string') {
      return auth.token;
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    return type === 'Bearer' ? token : undefined;
  }

  // CN: 处理 demo-websocket 的 get user 实时消息；EN: Handles the get user real-time message for demo-websocket.
  private getUser(client: DemoWebsocketSocket): JwtAuthenticatedUser {
    const { user } = client.data;

    if (!user) {
      throw new Error('Authenticated websocket user is missing.');
    }

    return user;
  }
}

// CN: 处理 demo-websocket 的 is record 实时消息；EN: Handles the is record real-time message for demo-websocket.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
