// CN: 服务，承载 demo-events 的业务逻辑；EN: Service holds business logic for demo-events.
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
  // CN: 初始化 demo-events 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-events.
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logService: DemoEventsLogService,
  ) {}

  // CN: 执行 demo-events 的 register user 业务逻辑；EN: Runs the register user business logic for demo-events.
  registerUser(registerDemoUserDto: RegisterDemoUserDto): DemoEventResultDto {
    const beforeEmit = this.logService.count();
    const event = new DemoUserRegisteredEvent(
      randomUUID(),
      registerDemoUserDto.email,
      registerDemoUserDto.displayName,
      new Date().toISOString(),
    );

    const emitted = this.eventEmitter.emit(DEMO_EVENTS.UserRegistered, event);

    return {
      scenario: 'domain event fans out to audit, notification, and trace',
      eventName: event.eventName,
      emitted,
      records: this.logService.findSince(beforeEmit),
    };
  }

  // CN: 执行 demo-events 的 invalidate cache 业务逻辑；EN: Runs the invalidate cache business logic for demo-events.
  invalidateCache(
    invalidateDemoCacheDto: InvalidateDemoCacheDto,
  ): DemoEventResultDto {
    const beforeEmit = this.logService.count();
    const event = new DemoCacheInvalidationRequestedEvent(
      invalidateDemoCacheDto.cacheKey,
      invalidateDemoCacheDto.reason,
      new Date().toISOString(),
    );

    const emitted = this.eventEmitter.emit(
      DEMO_EVENTS.CacheInvalidationRequested,
      event,
    );

    return {
      scenario:
        'cache invalidation event fans out to cache work, audit, and trace',
      eventName: event.eventName,
      emitted,
      records: this.logService.findSince(beforeEmit),
    };
  }

  // CN: 执行 demo-events 的 get overview 业务逻辑；EN: Runs the get overview business logic for demo-events.
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

  // CN: 执行 demo-events 的 clear 业务逻辑；EN: Runs the clear business logic for demo-events.
  clear(): void {
    this.logService.clear();
  }
}
