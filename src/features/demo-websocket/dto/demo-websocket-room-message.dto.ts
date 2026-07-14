// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ROOM_NAME_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export class DemoWebsocketRoomMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(ROOM_NAME_PATTERN)
  readonly room: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  readonly message: string;
}
