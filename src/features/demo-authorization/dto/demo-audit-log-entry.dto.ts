// CN: DTO 文件，定义 demo-authorization 的数据结构；EN: DTO file defines data shapes for demo-authorization.
export class DemoAuditLogEntryDto {
  readonly action: string;
  readonly actor: string;
  readonly resource: string;
}
