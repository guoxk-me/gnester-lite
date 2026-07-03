// CN: 类型文件，描述 demo-session 的 TypeScript 契约；EN: Type file describes TypeScript contracts for demo-session.
export const DEMO_SESSION_ROLES = ['admin', 'member', 'viewer'] as const;
export const DEMO_SESSION_FLASH_LEVELS = [
  'info',
  'success',
  'warning',
  'error',
] as const;

export type DemoSessionRole = (typeof DEMO_SESSION_ROLES)[number];
export type DemoSessionFlashLevel = (typeof DEMO_SESSION_FLASH_LEVELS)[number];

export interface DemoSessionUser {
  readonly userId: string;
  readonly displayName: string;
  readonly role: DemoSessionRole;
  readonly authenticatedAt: string;
}

export interface DemoSessionFlashMessage {
  readonly id: string;
  readonly level: DemoSessionFlashLevel;
  readonly message: string;
  readonly createdAt: string;
}

export interface DemoSessionCartItem {
  readonly sku: string;
  readonly name?: string;
  readonly quantity: number;
  readonly addedAt: string;
  readonly updatedAt: string;
}

export interface DemoSessionState {
  visits: number;
  user?: DemoSessionUser;
  flashMessages: DemoSessionFlashMessage[];
  cart: DemoSessionCartItem[];
}
