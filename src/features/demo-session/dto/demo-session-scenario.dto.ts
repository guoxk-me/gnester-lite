// CN: DTO 文件，定义 demo-session 的数据结构；EN: DTO file defines data shapes for demo-session.
export class DemoSessionScenarioDto {
  readonly name: string;
  readonly method: string;
  readonly route: string;
  readonly useCase: string;
  readonly nestPattern: string;
}
