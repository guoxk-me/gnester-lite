import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

type JwtExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

export interface JwtPolicy {
  readonly secret: string;
  readonly algorithm: 'HS256';
  readonly issuer: string;
  readonly audience: string;
  readonly accessTokenTtl: JwtExpiresIn;
}

export const JWT_LOCAL_DEVELOPMENT_SECRET = 'gnester-lite-local-jwt-secret';

// AI modified: every JWT producer and consumer reads one algorithm/claims policy.
export function readJwtPolicy(configService: ConfigService): JwtPolicy {
  return {
    secret:
      configService.get<string>('JWT_SECRET') || JWT_LOCAL_DEVELOPMENT_SECRET,
    algorithm: 'HS256',
    issuer: configService.get<string>('JWT_ISSUER', 'gnester-lite'),
    audience: configService.get<string>('JWT_AUDIENCE', 'gnester-lite'),
    accessTokenTtl: configService.get<string>(
      'JWT_ACCESS_TOKEN_TTL',
      '15m',
    ) as JwtExpiresIn,
  };
}
