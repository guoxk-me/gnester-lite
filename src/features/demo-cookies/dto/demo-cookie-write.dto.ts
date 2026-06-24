// CN: DTO 文件，定义 demo-cookies 的数据结构；EN: DTO file defines data shapes for demo-cookies.
export class DemoCookieWriteDto {
  readonly name: string;
  readonly action: 'set' | 'clear';
  readonly httpOnly: boolean;
  readonly secure: boolean;
  readonly sameSite: string | boolean;
  readonly path: string;
  readonly maxAge?: number;
  readonly signed: boolean;
}
