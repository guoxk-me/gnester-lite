// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DemoWebsocketPingDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  readonly message?: string;
}
