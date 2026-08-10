import { TestingModule, Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DEMO_EVENTS } from './demo-events.constants';
import {
  DEMO_EVENT_LOG_CAPACITY,
  DemoEventsLogService,
} from './demo-events-log.service';
import { DemoEventsModule } from './demo-events.module';
import { DemoEventsService } from './demo-events.service';

describe('DemoEventsService', () => {
  let module: TestingModule;
  let logService: DemoEventsLogService;
  let service: DemoEventsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
        }),
        DemoEventsModule,
      ],
    }).compile();
    await module.init();

    service = module.get<DemoEventsService>(DemoEventsService);
    logService = module.get<DemoEventsLogService>(DemoEventsLogService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('fans a user registration event out to audit, notification, and trace handlers', () => {
    const result = service.registerUser({
      email: 'user@example.com',
      displayName: 'Demo User',
    });

    expect(result).toEqual({
      scenario: 'domain event fans out to audit, notification, and trace',
      eventName: DEMO_EVENTS.UserRegistered,
      emitted: true,
      records: expect.any(Array) as unknown,
    });
    expect(result.records).toHaveLength(3);
    expect(result.records.map((record) => record.kind)).toEqual(
      expect.arrayContaining(['audit', 'notification', 'trace']),
    );
    expect(result.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: DEMO_EVENTS.UserRegistered,
          message: 'Send welcome email to user@example.com',
        }),
      ]),
    );
  });

  it('fans a cache invalidation event out to cache, audit, and trace handlers', () => {
    const result = service.invalidateCache({
      cacheKey: 'demo:user:42',
      reason: 'user profile updated',
    });

    expect(result.eventName).toBe(DEMO_EVENTS.CacheInvalidationRequested);
    expect(result.emitted).toBe(true);
    expect(result.records).toHaveLength(3);
    expect(result.records.map((record) => record.kind)).toEqual(
      expect.arrayContaining(['audit', 'cache-invalidation', 'trace']),
    );
    expect(result.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cache-invalidation',
          message: 'Invalidate cache key demo:user:42',
        }),
      ]),
    );
  });

  it('returns supported scenarios and accumulated event records for inspection', () => {
    service.registerUser({
      email: 'user@example.com',
      displayName: 'Demo User',
    });

    const overview = service.getOverview();

    expect(overview.events).toEqual([
      DEMO_EVENTS.UserRegistered,
      DEMO_EVENTS.CacheInvalidationRequested,
    ]);
    expect(overview.scenarios).toEqual(
      expect.arrayContaining([
        'write audit records',
        'trigger notifications',
        'invalidate cache after data changes',
        'trace an event namespace with wildcard listeners',
      ]),
    );
    expect(overview.records).toHaveLength(3);
  });

  it('clears in-memory demo records without changing supported scenarios', () => {
    service.invalidateCache({
      cacheKey: 'demo:user:42',
      reason: 'user profile updated',
    });

    service.clear();

    expect(service.getOverview()).toEqual({
      events: [
        DEMO_EVENTS.UserRegistered,
        DEMO_EVENTS.CacheInvalidationRequested,
      ],
      scenarios: expect.any(Array) as unknown,
      records: [],
    });
  });

  it('evicts the oldest records when the fixed in-memory capacity is exceeded', () => {
    for (let index = 0; index < DEMO_EVENT_LOG_CAPACITY + 2; index += 1) {
      logService.record({
        kind: 'audit',
        scenario: 'capacity test',
        eventName: 'demo-events.capacity',
        message: `record ${index + 1}`,
      });
    }

    const records = logService.findAll();

    expect(records).toHaveLength(DEMO_EVENT_LOG_CAPACITY);
    expect(records[0]?.id).toBe(3);
    expect(records.at(-1)?.id).toBe(DEMO_EVENT_LOG_CAPACITY + 2);
  });

  it('returns every record from one emit even when that emit crosses the eviction boundary', () => {
    for (let index = 0; index < DEMO_EVENT_LOG_CAPACITY - 1; index += 1) {
      logService.record({
        kind: 'audit',
        scenario: 'cursor test',
        eventName: 'demo-events.cursor',
        message: `record ${index + 1}`,
      });
    }

    const result = service.registerUser({
      email: 'user@example.com',
      displayName: 'Demo User',
    });

    expect(result.records.map((record) => record.id)).toEqual([
      DEMO_EVENT_LOG_CAPACITY,
      DEMO_EVENT_LOG_CAPACITY + 1,
      DEMO_EVENT_LOG_CAPACITY + 2,
    ]);
    expect(logService.findAll()).toHaveLength(DEMO_EVENT_LOG_CAPACITY);
  });

  it('resets the event cursor and record ids when the demo log is cleared', () => {
    logService.record({
      kind: 'audit',
      scenario: 'clear test',
      eventName: 'demo-events.clear',
      message: 'before clear',
    });

    logService.clear();
    const firstRecordAfterClear = logService.record({
      kind: 'audit',
      scenario: 'clear test',
      eventName: 'demo-events.clear',
      message: 'after clear',
    });

    expect(firstRecordAfterClear.id).toBe(1);
    expect(logService.cursor()).toBe(1);
    expect(logService.findAll()).toEqual([firstRecordAfterClear]);
  });
});
