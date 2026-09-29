import { DemoCacheInvalidationRequestedEvent } from './demo-cache-invalidation-requested.event.js';
import { DemoUserRegisteredEvent } from './demo-user-registered.event.js';

export type DemoEventPayload =
  DemoUserRegisteredEvent | DemoCacheInvalidationRequestedEvent;
