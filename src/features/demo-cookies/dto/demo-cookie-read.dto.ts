// CN: DTO 文件，定义 demo-cookies 的数据结构；EN: DTO file defines data shapes for demo-cookies.
export class DemoCookieReadDto {
  readonly name?: string;
  readonly found: boolean;
  readonly value: unknown;
}
