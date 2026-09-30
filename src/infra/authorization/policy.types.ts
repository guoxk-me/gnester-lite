import type { ExecutionContext } from '@nestjs/common';

import type { JwtAuthenticatedUser } from '../auth/jwt-user.types.js';

export type PolicyHandler = (
  user: JwtAuthenticatedUser,
  context: ExecutionContext,
) => boolean | Promise<boolean>;
