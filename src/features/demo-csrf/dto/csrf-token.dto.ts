// CN: DTO 文件，定义 demo-csrf 的数据结构；EN: DTO file defines data shapes for demo-csrf.
export class CsrfTokenDto {
  readonly csrfToken: string;
  readonly headerName: string;
}
