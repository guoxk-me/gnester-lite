// CN: 守卫，保护 authorization common 的访问边界；EN: Guard protects access boundaries for authorization common.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  // CN: 初始化 authorization common 的依赖和运行状态；EN: Initializes dependencies and runtime state for authorization common.
  constructor(private readonly reflector: Reflector) {}

  // CN: 判断 authorization common 的 can activate 访问权限；EN: Checks can activate access for authorization common.
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      readonly string[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPermissions = request.user?.permissions ?? [];
    const hasEveryPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasEveryPermission) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
