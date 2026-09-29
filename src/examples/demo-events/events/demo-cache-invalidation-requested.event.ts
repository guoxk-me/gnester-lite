import { DEMO_EVENTS } from '../demo-events.constants.js';

export class DemoCacheInvalidationRequestedEvent {
  readonly eventName = DEMO_EVENTS.CacheInvalidationRequested;

  constructor(
    readonly cacheKey: string,
    readonly reason: string,
    readonly requestedAt: string,
  ) {}
}
