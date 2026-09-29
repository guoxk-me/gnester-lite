export interface LocalAuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}
