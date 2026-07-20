// CN: DTO 文件，定义 demo-authorization 的数据结构；EN: DTO file defines data shapes for demo-authorization.
export class DemoOwnedProfileDto {
  readonly id: string;
  readonly viewedBy: string;
  readonly visibility: string;
}
