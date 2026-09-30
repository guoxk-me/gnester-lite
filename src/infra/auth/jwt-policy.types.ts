import type { JwtModuleOptions } from '@nestjs/jwt';

export type JwtExpiresIn = NonNullable<
  JwtModuleOptions['signOptions']
>['expiresIn'];

export interface JwtPolicy {
  readonly secret: string;
  readonly algorithm: 'HS256';
  readonly issuer: string;
  readonly audience: string;
  readonly accessTokenTtl: JwtExpiresIn;
}
