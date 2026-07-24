// CN: 服务，承载 demo-auth 的业务逻辑；EN: Service holds business logic for demo-auth.
import { Injectable } from '@nestjs/common';

import { AccessTokenDto } from '../../common/auth/dto/access-token.dto';
import { AuthTokenService } from '../../common/auth/auth-token.service';
import { PasswordHashService } from '../../common/auth/password-hash.service';
import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import type { LocalAuthenticatedUser } from '../../common/auth/types/local-authenticated-user.type';
import { DemoAuthScenarioDto } from './dto/demo-auth-scenario.dto';

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

@Injectable()
export class DemoAuthService {
  // CN: 初始化 demo-auth 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-auth.
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  // CN: 执行 demo-auth 的 get scenarios 业务逻辑；EN: Runs the get scenarios business logic for demo-auth.
  getScenarios(): DemoAuthScenarioDto[] {
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
        name: 'Public route escape hatch',
        method: 'GET',
        route: '/demo-auth/scenarios',
        useCase:
          'Keep documentation, health checks, login, and webhooks reachable when auth guards are enabled.',
        nestPattern: '@Public() marks endpoints that bypass AuthGuard.',
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
  // CN: 校验用户名密码，供 LocalStrategy 调用；EN: Validates credentials for LocalStrategy.
  async validateUser(
    username: string,
    password: string,
  ): Promise<LocalAuthenticatedUser | null> {
    const user = DEMO_USERS.find((item) => item.username === username);

    if (
      !user ||
      !(await this.passwordHashService.verify(password, user.passwordHash))
    ) {
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
  // CN: 为已校验用户签发访问令牌；EN: Issues an access token for a validated user.
  async login(user: LocalAuthenticatedUser): Promise<AccessTokenDto> {
    return {
      accessToken: await this.authTokenService.signAccessToken({
        sub: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
      }),
      tokenType: 'Bearer',
      expiresIn: '15m',
    };
  }

  // CN: 执行 demo-auth 的 get profile 业务逻辑；EN: Runs the get profile business logic for demo-auth.
  getProfile(user: JwtAuthenticatedUser): JwtAuthenticatedUser {
    return user;
  }
}
