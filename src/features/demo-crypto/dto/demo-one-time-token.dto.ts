// CN: DTO 文件，定义 demo-crypto 的数据结构；EN: DTO file defines data shapes for demo-crypto.
export class DemoOneTimeTokenDto {
  readonly scenario: string;
  readonly tokenPreview: string;
  readonly storedDigest: string;
  readonly verifies: boolean;
}
