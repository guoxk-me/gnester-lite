import type { Request } from 'express';

import type { JwtAuthenticatedUser } from './jwt-user.types.js';

export type AuthenticatedRequest = Request & {
  user?: JwtAuthenticatedUser;
};
