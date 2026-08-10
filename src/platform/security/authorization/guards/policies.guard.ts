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
  constructor(private readonly reflector: Reflector) {}

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
