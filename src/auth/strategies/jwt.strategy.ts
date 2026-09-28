import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

import { AuthTokenService } from '../auth-token.service';
import { extractBearerToken } from '../bearer-token';
import { readJwtPolicy } from '../jwt-policy';
import type { JwtAuthenticatedUser } from '../types/jwt-authenticated-user.type';

// AI modified: added Passport JwtStrategy per NestJS passport recipe, wired to existing JWT env config.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
  ) {
    const policy = readJwtPolicy(configService);

    super({
      jwtFromRequest: tokenFromRequest,
      ignoreExpiration: false,
      secretOrKey: policy.secret,
      issuer: policy.issuer,
      audience: policy.audience,
      algorithms: [policy.algorithm],
    });
  }

  validate(payload: unknown): JwtAuthenticatedUser {
    // AI modified: Passport and direct JWT consumers enforce the same payload schema.
    return this.authTokenService.validateAccessTokenPayload(payload);
  }
}

function tokenFromRequest(request: unknown): string | null {
  if (
    typeof request !== 'object' ||
    request === null ||
    !('headers' in request) ||
    typeof request.headers !== 'object' ||
    request.headers === null ||
    !('authorization' in request.headers) ||
    typeof request.headers.authorization !== 'string'
  ) {
    return null;
  }

  return extractBearerToken(request.headers.authorization) ?? null;
}
