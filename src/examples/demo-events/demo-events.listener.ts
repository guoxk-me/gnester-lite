import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { withSentryIsolation } from '../../platform/observability/sentry/with-sentry-isolation';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventsLogService } from './demo-events-log.service';
import { DemoCacheInvalidationRequestedEvent } from './events/demo-cache-invalidation-requested.event';
import { DemoUserRegisteredEvent } from './events/demo-user-registered.event';
import type { DemoEventPayload } from './events/demo-event-payload.type';

@Injectable()
export class DemoEventsListener {
  constructor(private readonly logService: DemoEventsLogService) {}

  @OnEvent(DEMO_EVENTS.UserRegistered)
  handleUserRegistered(event: DemoUserRegisteredEvent): void {
    // AI modified: isolate event side effects from the originating HTTP request scope.
    withSentryIsolation(
      () => {
        this.logService.record({
          kind: 'audit',
          scenario: 'write an audit record after a domain action',
          eventName: event.eventName,
          message: `User ${event.displayName} registered`,
          metadata: {
            userId: event.userId,
            email: event.email,
            occurredAt: event.occurredAt,
          },
        });

        this.logService.record({
          kind: 'notification',
          scenario: 'trigger a notification without coupling it to the command',
          eventName: event.eventName,
          message: `Send welcome email to ${event.email}`,
          metadata: {
            userId: event.userId,
            channel: 'email',
          },
        });
      },
      // AI modified: synchronous event errors flow to the HTTP filter, which owns capture.
      { captureErrors: false },
    );
  }

  @OnEvent(DEMO_EVENTS.CacheInvalidationRequested)
  handleCacheInvalidation(event: DemoCacheInvalidationRequestedEvent): void {
    withSentryIsolation(
      () => {
        this.logService.record({
          kind: 'cache-invalidation',
          scenario: 'invalidate cache after data changes',
          eventName: event.eventName,
          message: `Invalidate cache key ${event.cacheKey}`,
          metadata: {
            cacheKey: event.cacheKey,
            reason: event.reason,
            requestedAt: event.requestedAt,
          },
        });

        this.logService.record({
          kind: 'audit',
          scenario: 'record operational side effects',
          eventName: event.eventName,
          message: `Cache invalidation requested for ${event.cacheKey}`,
          metadata: {
            cacheKey: event.cacheKey,
          },
        });
      },
      { captureErrors: false },
    );
  }

  @OnEvent(DEMO_EVENTS.Wildcard)
  traceDemoEvent(event: DemoEventPayload): void {
    withSentryIsolation(
      () => {
        this.logService.record({
          kind: 'trace',
          scenario: 'observe a namespace of events with a wildcard listener',
          eventName: event.eventName,
          message: `Observed ${event.eventName}`,
          metadata: {
            wildcard: DEMO_EVENTS.Wildcard,
          },
        });
      },
      { captureErrors: false },
    );
  }
}
