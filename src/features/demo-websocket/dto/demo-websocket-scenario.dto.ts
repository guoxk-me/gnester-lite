// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
import { ApiProperty } from '@nestjs/swagger';

// AI modified: use an object payload so AsyncAPI emits a valid schema for the no-argument event.
export class DemoWebsocketScenariosRequestDto {}

export class DemoWebsocketScenarioDto {
  @ApiProperty({
    description: 'Scenario name',
    example: 'Authenticated socket handshake',
  })
  readonly name: string;

  @ApiProperty({
    description: 'Event name',
    example: 'connection',
  })
  readonly eventName: string;

  @ApiProperty({
    description: 'Message direction',
    example: 'client-to-server',
    enum: ['client-to-server', 'server-to-client'],
  })
  readonly direction: 'client-to-server' | 'server-to-client';

  @ApiProperty({
    description: 'Use case description',
    example: 'Verify a JWT before accepting a long-lived websocket connection.',
  })
  readonly useCase: string;

  @ApiProperty({
    description: 'Corresponding NestJS pattern',
    example: 'Use OnGatewayConnection to validate Socket.IO handshake auth.',
  })
  readonly nestPattern: string;
}
