// CN: DTO 文件，定义 demo-security 的数据结构；EN: DTO file defines data shapes for demo-security.
import { DemoSecurityHeaderDto } from './demo-security-header.dto';

export class DemoSecurityOverviewDto {
  readonly middleware: string;
  readonly registration: string;
  readonly headers: DemoSecurityHeaderDto[];
  readonly scenarios: string[];
  readonly notes: string[];
}
