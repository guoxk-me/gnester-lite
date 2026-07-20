// CN: 守卫，保护 authorization common 的访问边界；EN: Guard protects access boundaries for authorization common.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import {
  CHECK_POLICIES_KEY,
  type PolicyHandler,
} from '../decorators/check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  // CN: 初始化 authorization common 的依赖和运行状态；EN: Initializes dependencies and runtime state for authorization common.
  constructor(private readonly reflector: Reflector) {}

  // CN: 判断 authorization common 的 can activate 访问权限；EN: Checks can activate access for authorization common.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.getAllAndOverride<
      readonly PolicyHandler[]
    >(CHECK_POLICIES_KEY, [context.getHandler(), context.getClass()]);

    if (!policyHandlers?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    for (const handler of policyHandlers) {
      if (!(await handler(user, context))) {
        throw new ForbiddenException('Policy check failed');
      }
    }

    return true;
  }
}
