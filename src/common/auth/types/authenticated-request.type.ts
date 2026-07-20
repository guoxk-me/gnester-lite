// CN: 类型文件，描述 auth common 的 TypeScript 契约；EN: Type file describes TypeScript contracts for auth common.
import type { Request } from 'express';

import type { JwtAuthenticatedUser } from './jwt-authenticated-user.type';

export type AuthenticatedRequest = Request & {
  user?: JwtAuthenticatedUser;
};
