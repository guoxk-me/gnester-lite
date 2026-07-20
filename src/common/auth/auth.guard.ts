// CN: 守卫，保护 auth common 的访问边界；EN: Guard protects access boundaries for auth common.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import type { AuthenticatedRequest } from './types/authenticated-request.type';
import type { JwtAuthenticatedUser } from './types/jwt-authenticated-user.type';

@Injectable()
export class AuthGuard implements CanActivate {
  // CN: 初始化 auth common 的依赖和运行状态；EN: Initializes dependencies and runtime state for auth common.
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  // CN: 判断 auth common 的 can activate 访问权限；EN: Checks can activate access for auth common.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      request.user =
        await this.jwtService.verifyAsync<JwtAuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  // CN: 判断 auth common 的 extract token from header 访问权限；EN: Checks extract token from header access for auth common.
  private extractTokenFromHeader(
    request: AuthenticatedRequest,
  ): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
