// CN: 装饰器，标记 auth common 的元数据；EN: Decorator marks metadata for auth common.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { JwtAuthenticatedUser } from '../types/jwt-authenticated-user.type';

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): JwtAuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
