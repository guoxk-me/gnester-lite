// CN: 类型文件，描述 auth common 的 TypeScript 契约；EN: Type file describes TypeScript contracts for auth common.
export interface JwtAuthenticatedUser {
  readonly sub: string;
  readonly username: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly iat?: number;
  readonly exp?: number;
  readonly iss?: string;
  readonly aud?: string | string[];
}
