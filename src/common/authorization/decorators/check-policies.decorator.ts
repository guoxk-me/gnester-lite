// CN: 装饰器，标记 authorization common 的元数据；EN: Decorator marks metadata for authorization common.
import { SetMetadata, type ExecutionContext } from '@nestjs/common';

import type { JwtAuthenticatedUser } from '../../auth/types/jwt-authenticated-user.type';

export type PolicyHandler = (
  user: JwtAuthenticatedUser,
  context: ExecutionContext,
) => boolean | Promise<boolean>;

export const CHECK_POLICIES_KEY = 'checkPolicies';

// CN: 执行 authorization common 的 check policies 逻辑；EN: Runs the check policies logic for authorization common.
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
