// CN: DTO 文件，定义 demo-sse 的数据结构；EN: DTO file defines data shapes for demo-sse.
export class DemoSseScenarioDto {
  readonly name: string;
  readonly route: string;
  readonly eventType: string;
  readonly useCase: string;
  readonly demonstrates: string;

  // CN: 初始化 demo-sse 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-sse.
  constructor(partial: DemoSseScenarioDto) {
    Object.assign(this, partial);
  }
}
