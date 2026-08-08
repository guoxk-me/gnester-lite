import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { readJwtPolicy } from './jwt-policy';
import type { JwtAuthenticatedUser } from './types/jwt-authenticated-user.type';

export type AccessTokenPayload = Pick<
  JwtAuthenticatedUser,
  'sub' | 'username' | 'roles' | 'permissions'
>;

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const policy = readJwtPolicy(this.configService);

    // AI modified: signing explicitly applies the same claims policy used by all verifiers.
    return this.jwtService.signAsync(payload, {
      secret: policy.secret,
      algorithm: policy.algorithm,
      expiresIn: policy.accessTokenTtl,
      issuer: policy.issuer,
      audience: policy.audience,
    });
  }

  getAccessTokenTtl(): string {
    return String(readJwtPolicy(this.configService).accessTokenTtl);
  }

  async verifyAccessToken(token: string): Promise<JwtAuthenticatedUser> {
    const policy = readJwtPolicy(this.configService);
    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
      token,
      {
        secret: policy.secret,
        algorithms: [policy.algorithm],
        issuer: policy.issuer,
        audience: policy.audience,
      },
    );

    return this.validateAccessTokenPayload(payload);
  }

  validateAccessTokenPayload(payload: unknown): JwtAuthenticatedUser {
    if (
      !isRecord(payload) ||
      !isNonEmptyString(payload.sub) ||
      !isNonEmptyString(payload.username) ||
      !isValidStringArray(payload.roles) ||
      !isValidStringArray(payload.permissions) ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      (payload.exp as number) <= (payload.iat as number)
    ) {
      throw new UnauthorizedException();
    }

    // AI modified: consumers receive one validated, minimal identity shape.
    return {
      sub: payload.sub,
      username: payload.username,
      ...(payload.roles === undefined ? {} : { roles: payload.roles }),
      ...(payload.permissions === undefined
        ? {}
        : { permissions: payload.permissions }),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidStringArray(
  value: unknown,
): value is readonly string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((entry) => typeof entry === 'string' && entry.length > 0))
  );
}
