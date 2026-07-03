// CN: DTO 文件，定义 demo-http 的数据结构；EN: DTO file defines data shapes for demo-http.
export class DemoHttpProviderStatusDto {
  readonly providerBaseUrl: string;
  readonly status: number;
  readonly statusText: string;
  readonly reachable: boolean;
}
