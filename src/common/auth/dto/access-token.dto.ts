// CN: DTO 文件，定义 auth common 的数据结构；EN: DTO file defines data shapes for auth common.
export class AccessTokenDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}
