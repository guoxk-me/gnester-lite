import type { Request } from 'express';

import type { SessionUser } from './session.types.js';

export interface SessionRequest extends Request {
  sessionUser: SessionUser;
}
