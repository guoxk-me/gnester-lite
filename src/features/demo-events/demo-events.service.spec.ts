// CN: 测试文件，验证 demo-events 的行为契约；EN: Test file verifies behavior contracts for demo-events.
import { TestingModule, Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventsModule } from './demo-events.module';
import { DemoEventsService } from './demo-events.service';

// CN: 测试分组：DemoEventsService；EN: Test group: DemoEventsService.
describe('DemoEventsService', () => {
  let module: TestingModule;
  let service: DemoEventsService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    await module.close();
  });

  // CN: 测试用例：fans a user registration event out to audit, notification, and trace handlers；EN: Test case: fans a user registration event out to audit, notification, and trace handlers.
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

  // CN: 测试用例：fans a cache invalidation event out to cache, audit, and trace handlers；EN: Test case: fans a cache invalidation event out to cache, audit, and trace handlers.
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

  // CN: 测试用例：returns supported scenarios and accumulated event records for inspection；EN: Test case: returns supported scenarios and accumulated event records for inspection.
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

  // CN: 测试用例：clears in-memory demo records without changing supported scenarios；EN: Test case: clears in-memory demo records without changing supported scenarios.
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
});
