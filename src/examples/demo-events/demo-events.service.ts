import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventOverviewDto } from './dto/demo-event-overview.dto';
import { DemoEventResultDto } from './dto/demo-event-result.dto';
import { InvalidateDemoCacheDto } from './dto/invalidate-demo-cache.dto';
import { RegisterDemoUserDto } from './dto/register-demo-user.dto';
import { DemoEventsLogService } from './demo-events-log.service';
import { DemoCacheInvalidationRequestedEvent } from './events/demo-cache-invalidation-requested.event';
import { DemoUserRegisteredEvent } from './events/demo-user-registered.event';

@Injectable()
export class DemoEventsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logService: DemoEventsLogService,
  ) {}

  registerUser(registerDemoUserDto: RegisterDemoUserDto): DemoEventResultDto {
    const beforeEmit = this.logService.cursor();
    const event = new DemoUserRegisteredEvent(
      randomUUID(),
      registerDemoUserDto.email,
      registerDemoUserDto.displayName,
      new Date().toISOString(),
    );

    const hasListeners = this.eventEmitter.emit(
      DEMO_EVENTS.UserRegistered,
      event,
    );

    return {
      scenario: 'domain event fans out to audit, notification, and trace',
      eventName: event.eventName,
      emitted: hasListeners,
      records: this.logService.findAfter(beforeEmit),
    };
  }

  invalidateCache(
    invalidateDemoCacheDto: InvalidateDemoCacheDto,
  ): DemoEventResultDto {
    const beforeEmit = this.logService.cursor();
    const event = new DemoCacheInvalidationRequestedEvent(
      invalidateDemoCacheDto.cacheKey,
      invalidateDemoCacheDto.reason,
      new Date().toISOString(),
    );

    const hasListeners = this.eventEmitter.emit(
      DEMO_EVENTS.CacheInvalidationRequested,
      event,
    );

    return {
      scenario:
        'cache invalidation event fans out to cache work, audit, and trace',
      eventName: event.eventName,
      emitted: hasListeners,
      records: this.logService.findAfter(beforeEmit),
    };
  }

  getOverview(): DemoEventOverviewDto {
    return {
      events: [
        DEMO_EVENTS.UserRegistered,
        DEMO_EVENTS.CacheInvalidationRequested,
      ],
      scenarios: [
        'decouple domain actions from side effects',
        'write audit records',
        'trigger notifications',
        'invalidate cache after data changes',
        'trace an event namespace with wildcard listeners',
      ],
      records: this.logService.findAll(),
    };
  }

  clear(): void {
    this.logService.clear();
  }
}
