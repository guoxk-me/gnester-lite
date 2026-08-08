import { DemoCacheInvalidationRequestedEvent } from './demo-cache-invalidation-requested.event';
import { DemoUserRegisteredEvent } from './demo-user-registered.event';

export type DemoEventPayload =
  | DemoUserRegisteredEvent
  | DemoCacheInvalidationRequestedEvent;
