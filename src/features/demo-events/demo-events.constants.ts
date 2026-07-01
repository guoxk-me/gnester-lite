// CN: 常量文件，集中 demo-events 的稳定标识；EN: Constants file centralizes stable identifiers for demo-events.
export const DEMO_EVENTS = {
  UserRegistered: 'demo-events.user.registered',
  CacheInvalidationRequested: 'demo-events.cache.invalidate.requested',
  Wildcard: 'demo-events.**',
} as const;

export type DemoEventName = (typeof DEMO_EVENTS)[keyof typeof DEMO_EVENTS];
