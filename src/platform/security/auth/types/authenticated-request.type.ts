import type { Request } from 'express';

import type { JwtAuthenticatedUser } from './jwt-authenticated-user.type';

export type AuthenticatedRequest = Request & {
  user?: JwtAuthenticatedUser;
};
