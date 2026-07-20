// CN: 服务，承载 demo-auth 的业务逻辑；EN: Service holds business logic for demo-auth.
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AccessTokenDto } from '../../common/auth/dto/access-token.dto';
import { AuthTokenService } from '../../common/auth/auth-token.service';
import { PasswordHashService } from '../../common/auth/password-hash.service';
import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import { DemoAuthScenarioDto } from './dto/demo-auth-scenario.dto';
import { SignInDto } from './dto/sign-in.dto';

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
        name: 'JWT bearer API',
        method: 'POST / GET',
        route: '/demo-auth/login -> /demo-auth/profile',
        useCase:
          'Issue a short-lived access token after login and require it on stateless API requests.',
        nestPattern:
          'Use a DTO for credentials, JwtService for token signing, and AuthGuard for bearer validation.',
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
          'AuthGuard assigns request.user and @CurrentUser() exposes it to route handlers.',
      },
    ];
  }

  // CN: 执行 demo-auth 的 sign in 业务逻辑；EN: Runs the sign in business logic for demo-auth.
  async signIn(dto: SignInDto): Promise<AccessTokenDto> {
    const user = DEMO_USERS.find((item) => item.username === dto.username);

    if (
      !user ||
      !(await this.passwordHashService.verify(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException();
    }

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
