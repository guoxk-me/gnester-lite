// CN: 响应 DTO，定义 demo-websocket 的服务器推送数据结构
// EN: Response DTOs define data shapes for server-published events in demo-websocket.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemoWebsocketPongResponseDto {
  @ApiProperty({
    description: 'Authenticated user ID (JWT sub)',
    example: 'user_abc123',
  })
  readonly userId: string;

  @ApiProperty({ description: 'Authenticated username', example: 'alice' })
  readonly username: string;

  @ApiProperty({
    description: 'Echoed ping message or default "pong"',
    example: 'hello',
  })
  readonly message: string;
}

export class DemoWebsocketRoomJoinedResponseDto {
  @ApiProperty({ description: 'Room name', example: 'room:general' })
  readonly room: string;

  @ApiProperty({ description: 'User ID who joined', example: 'user_abc123' })
  readonly userId: string;

  @ApiProperty({ description: 'Username who joined', example: 'alice' })
  readonly username: string;
}

export class DemoWebsocketRoomBroadcastDto {
  @ApiProperty({ description: 'Room name', example: 'room:general' })
  readonly room: string;

  @ApiProperty({ description: "Sender's user ID", example: 'user_abc123' })
  readonly userId: string;

  @ApiProperty({ description: "Sender's username", example: 'alice' })
  readonly username: string;

  @ApiProperty({ description: 'Message content', example: 'Hello everyone!' })
  readonly message: string;
}

export class DemoWebsocketMessageAcceptedDto {
  @ApiProperty({
    description: 'Room the message was broadcast to',
    example: 'room:general',
  })
  readonly room: string;
}

export class DemoWebsocketErrorDto {
  @ApiProperty({ description: 'Error code', example: 'WEBSOCKET_UNAUTHORIZED' })
  readonly code: string;

  @ApiProperty({
    description: 'Error description',
    example: 'Unauthorized websocket connection',
  })
  readonly message: string;
}

export class DemoWebsocketErrorDetailDto {
  @ApiProperty({
    description: 'Field name that failed validation',
    example: 'room',
  })
  readonly field: string;

  @ApiProperty({
    description: 'Validation failure reason',
    example: 'room must match /^[a-zA-Z0-9:_-]+$/',
  })
  readonly reason: string;
}

export class DemoWebsocketExceptionDto {
  @ApiProperty({
    description: 'Exception code',
    example: 'WEBSOCKET_VALIDATION_FAILED',
  })
  readonly code: string;

  @ApiProperty({
    description: 'Exception message',
    example: 'Validation failed',
  })
  readonly message: string;

  @ApiPropertyOptional({
    description: 'Validation error details (present on validation failures)',
    type: DemoWebsocketErrorDetailDto,
    isArray: true,
  })
  readonly errors?: DemoWebsocketErrorDetailDto[];
}

export class DemoWebsocketInterceptedDto {
  @ApiProperty({
    description: 'The original event name',
    example: 'demo-websocket.ping',
  })
  readonly event: string;

  @ApiProperty({ description: 'The socket ID', example: 'socket_xyz' })
  readonly socketId: string;

  @ApiProperty({
    description: 'The authenticated user ID, or null',
    example: 'user_abc123',
    nullable: true,
  })
  readonly userId: string | null;
}
