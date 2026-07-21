// CN: DTO 文件，定义 demo-crypto 的数据结构；EN: DTO file defines data shapes for demo-crypto.
export class DemoEncryptedSecretDto {
  readonly scenario: string;
  readonly encrypted: string;
  readonly decryptedPreview: string;
  readonly authenticatedContext: string;
}
