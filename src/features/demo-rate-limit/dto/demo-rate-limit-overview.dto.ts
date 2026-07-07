// CN: DTO 文件，定义 demo-rate-limit 的数据结构；EN: DTO file defines data shapes for demo-rate-limit.
export class DemoRateLimitOverviewDto {
  readonly module: string;
  readonly package: string;
  readonly registration: string;
  readonly scenarios: string[];
}
