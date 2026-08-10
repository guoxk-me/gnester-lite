import { Injectable } from '@nestjs/common';

import { AuthTokenService } from '../../platform/security/auth/auth-token.service';
import { PasswordHashService } from '../../platform/security/auth/password-hash.service';
import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import { AccessTokenDto } from './dto/access-token.dto';
import { DemoAuthProfileDto } from './dto/demo-auth-profile.dto';
import { DemoAuthScenarioDto } from './dto/demo-auth-scenario.dto';
import type { LocalAuthenticatedUser } from './local-authenticated-user.type';

interface DemoUser {
  readonly id: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

const DEMO_USERS: readonly DemoUser[] = [
  {
    id: 'demo-admin',
    username: 'admin@example.com',
    passwordHash:
      'scrypt$gnester-demo-admin$yjPgcmOP8Sk4YyUoZxOhBFXiQ_gH9cEny7ZMwrLWmbsxh6ShHl3R-QinrnASjcFnbvzUYp6BJUFVouFOAHu6Gg',
    roles: ['admin'],
    permissions: ['audit:read', 'demo:read'],
  },
];
const DUMMY_PASSWORD_HASH = DEMO_USERS[0].passwordHash;

@Injectable()
export class DemoAuthService {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  getScenarios(): DemoAuthScenarioDto[] {
    // AI modified: list only authentication flows implemented by this controller.
    return [
      {
        name: 'Passport local login + JWT bearer API',
        method: 'POST / GET',
        route: '/demo-auth/login -> /demo-auth/profile',
        useCase:
          'Validate username/password with LocalStrategy, issue a short-lived access token, then require JwtAuthGuard on stateless API requests.',
        nestPattern:
          'Use LocalAuthGuard + LocalStrategy for login, JwtService for token signing, and JwtAuthGuard + JwtStrategy for bearer validation.',
      },
      {
        name: 'Current user payload',
        method: 'GET',
        route: '/demo-auth/profile',
        useCase:
          'Read the authenticated subject and roles from the verified JWT payload inside a controller.',
        nestPattern:
          'JwtStrategy.validate assigns request.user and @CurrentUser() exposes it to route handlers.',
      },
    ];
  }

  // AI modified: split credential checks into validateUser for Passport LocalStrategy (NestJS passport recipe).
  async validateUser(
    username: string,
    password: string,
  ): Promise<LocalAuthenticatedUser | null> {
    const user = DEMO_USERS.find((item) => item.username === username);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    // AI modified: unknown usernames pay the same scrypt verification cost as known users.
    const isPasswordValid = await this.passwordHashService.verify(
      password,
      passwordHash,
    );

    if (!user || !isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  // AI modified: login signs JWT from LocalAuthGuard-attached user per NestJS passport recipe.
  async login(user: LocalAuthenticatedUser): Promise<AccessTokenDto> {
    return {
      accessToken: await this.authTokenService.signAccessToken({
        sub: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
      }),
      tokenType: 'Bearer',
      // AI modified: expose the exact TTL used by the shared token signer.
      expiresIn: this.authTokenService.getAccessTokenTtl(),
    };
  }

  getProfile(user: JwtAuthenticatedUser): DemoAuthProfileDto {
    // AI modified: expose only the documented identity allowlist, never token metadata.
    return {
      sub: user.sub,
      username: user.username,
      ...(user.roles === undefined ? {} : { roles: user.roles }),
      ...(user.permissions === undefined
        ? {}
        : { permissions: user.permissions }),
    };
  }
}
