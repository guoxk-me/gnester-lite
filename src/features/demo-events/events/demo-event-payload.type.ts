// CN: 类型文件，描述 demo-events 的 TypeScript 契约；EN: Type file describes TypeScript contracts for demo-events.
import { DemoCacheInvalidationRequestedEvent } from './demo-cache-invalidation-requested.event';
import { DemoUserRegisteredEvent } from './demo-user-registered.event';

export type DemoEventPayload =
  | DemoUserRegisteredEvent
  | DemoCacheInvalidationRequestedEvent;
