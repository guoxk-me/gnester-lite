// CN: 监听器，响应 demo-events 的领域事件；EN: Listener responds to domain events for demo-events.
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { withSentryIsolation } from '../../common/sentry/with-sentry-isolation';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventsLogService } from './demo-events-log.service';
import { DemoCacheInvalidationRequestedEvent } from './events/demo-cache-invalidation-requested.event';
import { DemoUserRegisteredEvent } from './events/demo-user-registered.event';
import type { DemoEventPayload } from './events/demo-event-payload.type';

@Injectable()
export class DemoEventsListener {
  // CN: 初始化 demo-events 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-events.
  constructor(private readonly logService: DemoEventsLogService) {}

  // CN: 监听并响应 demo-events 的 handle user registered 事件；EN: Listens for and handles the handle user registered event for demo-events.
  @OnEvent(DEMO_EVENTS.UserRegistered)
  handleUserRegistered(event: DemoUserRegisteredEvent): void {
    // AI modified: isolate event side effects from the originating HTTP request scope.
    withSentryIsolation(() => {
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
    });
  }

  // CN: 监听并响应 demo-events 的 handle cache invalidation 事件；EN: Listens for and handles the handle cache invalidation event for demo-events.
  @OnEvent(DEMO_EVENTS.CacheInvalidationRequested)
  handleCacheInvalidation(event: DemoCacheInvalidationRequestedEvent): void {
    withSentryIsolation(() => {
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
    });
  }

  // CN: 监听并响应 demo-events 的 trace demo event 事件；EN: Listens for and handles the trace demo event event for demo-events.
  @OnEvent(DEMO_EVENTS.Wildcard)
  traceDemoEvent(event: DemoEventPayload): void {
    withSentryIsolation(() => {
      this.logService.record({
        kind: 'trace',
        scenario: 'observe a namespace of events with a wildcard listener',
        eventName: event.eventName,
        message: `Observed ${event.eventName}`,
        metadata: {
          wildcard: DEMO_EVENTS.Wildcard,
        },
      });
    });
  }
}
