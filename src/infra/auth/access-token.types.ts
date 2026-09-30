import type { JwtAuthenticatedUser } from './jwt-user.types.js';

export type AccessTokenPayload = Pick<
  JwtAuthenticatedUser,
  'sub' | 'username' | 'roles' | 'permissions'
>;
