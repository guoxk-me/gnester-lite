export class DemoWebhookSignatureDto {
  readonly scenario!: string;
  readonly payload!: string;
  readonly signature!: string;
  readonly verifiesOriginalPayload!: boolean;
  readonly rejectsTamperedPayload!: boolean;
}
