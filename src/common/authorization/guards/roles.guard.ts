// CN: 守卫，保护 authorization common 的访问边界；EN: Guard protects access boundaries for authorization common.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  // CN: 初始化 authorization common 的依赖和运行状态；EN: Initializes dependencies and runtime state for authorization common.
  constructor(private readonly reflector: Reflector) {}

  // CN: 判断 authorization common 的 can activate 访问权限；EN: Checks can activate access for authorization common.
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<readonly string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = request.user?.roles ?? [];
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Missing required role');
    }

    return true;
  }
}
