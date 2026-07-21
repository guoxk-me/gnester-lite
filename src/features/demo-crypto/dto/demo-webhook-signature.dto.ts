// CN: DTO 文件，定义 demo-crypto 的数据结构；EN: DTO file defines data shapes for demo-crypto.
export class DemoWebhookSignatureDto {
  readonly scenario: string;
  readonly payload: string;
  readonly signature: string;
  readonly verifiesOriginalPayload: boolean;
  readonly rejectsTamperedPayload: boolean;
}
