// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ROOM_NAME_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export class DemoWebsocketRoomMessageDto {
  @ApiProperty({
    description: 'Target room name',
    example: 'room:general',
    minLength: 1,
    maxLength: 80,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(ROOM_NAME_PATTERN)
  readonly room: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  readonly message: string;
}
