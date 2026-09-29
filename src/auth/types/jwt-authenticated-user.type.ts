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
