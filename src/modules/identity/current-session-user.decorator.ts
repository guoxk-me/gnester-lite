import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';

import type { SessionRequest } from './session-request.types.js';
import type { SessionUser } from './session.types.js';

// AI modified: controllers consume the identity already checked by SessionAuthGuard.
export const CurrentSessionUser = createParamDecorator(
  (_parameter: unknown, context: ExecutionContext): SessionUser => {
    const user = context
      .switchToHttp()
      .getRequest<SessionRequest>().sessionUser;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
