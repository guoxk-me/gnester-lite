// CN: Passport JWT 策略，从 Authorization Bearer 提取并校验令牌；EN: Passport JWT strategy extracts and validates Bearer tokens.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtAuthenticatedUser } from '../types/jwt-authenticated-user.type';

// AI modified: added Passport JwtStrategy per NestJS passport recipe, wired to existing JWT env config.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'gnester-lite-local-jwt-secret',
      issuer: configService.get<string>('JWT_ISSUER', 'gnester-lite'),
      audience: configService.get<string>('JWT_AUDIENCE', 'gnester-lite'),
    });
  }

  validate(payload: JwtAuthenticatedUser): JwtAuthenticatedUser {
    return {
      sub: payload.sub,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
