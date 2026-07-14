// CN: DTO 文件，定义 demo-websocket 的数据结构；EN: DTO file defines data shapes for demo-websocket.
export class DemoWebsocketScenarioDto {
  readonly name: string;
  readonly eventName: string;
  readonly direction: 'client-to-server' | 'server-to-client';
  readonly useCase: string;
  readonly nestPattern: string;
}
