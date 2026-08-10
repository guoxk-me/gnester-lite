type BetterAuthModule = typeof import('better-auth');
type BetterAuthNodeModule = typeof import('better-auth/node');

export interface BetterAuthModules {
  readonly betterAuth: BetterAuthModule['betterAuth'];
  readonly toNodeHandler: BetterAuthNodeModule['toNodeHandler'];
}

export function loadBetterAuthModules(): Promise<BetterAuthModules>;
