import { SetMetadata, type ExecutionContext } from '@nestjs/common';

import type { JwtAuthenticatedUser } from '../../auth/types/jwt-authenticated-user.type';

export type PolicyHandler = (
  user: JwtAuthenticatedUser,
  context: ExecutionContext,
) => boolean | Promise<boolean>;

export const CHECK_POLICIES_KEY = 'checkPolicies';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
