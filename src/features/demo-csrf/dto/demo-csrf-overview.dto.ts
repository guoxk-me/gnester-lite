// CN: DTO 文件，定义 demo-csrf 的数据结构；EN: DTO file defines data shapes for demo-csrf.
export class DemoCsrfOverviewDto {
  readonly middleware: string;
  readonly tokenEndpoint: string;
  readonly protectedEndpoint: string;
  readonly headerName: string;
  readonly scenarios: string[];
  readonly notNeededFor: string[];
  readonly notes: string[];
}
