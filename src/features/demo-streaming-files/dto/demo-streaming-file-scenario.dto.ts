// CN: DTO 文件，定义 demo-streaming-files 的数据结构；EN: DTO file defines data shapes for demo-streaming-files.
export class DemoStreamingFileScenarioDto {
  readonly route: string;
  readonly scenario: string;
  readonly demonstrates: string;

  // CN: 初始化 demo-streaming-files 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-streaming-files.
  constructor(partial: DemoStreamingFileScenarioDto) {
    Object.assign(this, partial);
  }
}
