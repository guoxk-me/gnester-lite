type BetterAuthModule = typeof import('better-auth');
type BetterAuthNodeModule = typeof import('better-auth/node');
type BetterAuthAdminModule = typeof import('better-auth/plugins/admin');
type BetterAuthAdminAccessModule =
  typeof import('better-auth/plugins/admin/access');
type BetterAuthCryptoModule = typeof import('better-auth/crypto');

export interface BetterAuthModules {
  readonly betterAuth: BetterAuthModule['betterAuth'];
  readonly toNodeHandler: BetterAuthNodeModule['toNodeHandler'];
  readonly admin: BetterAuthAdminModule['admin'];
  readonly defaultAc: BetterAuthAdminAccessModule['defaultAc'];
  readonly hashPassword: BetterAuthCryptoModule['hashPassword'];
}

export function loadBetterAuthModules(): Promise<BetterAuthModules>;
