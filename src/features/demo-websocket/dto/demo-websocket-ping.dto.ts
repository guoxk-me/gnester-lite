// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DemoWebsocketPingDto {
  @ApiProperty({
    description: 'Optional custom ping message',
    example: 'hello',
    maxLength: 120,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  readonly message?: string;
}
