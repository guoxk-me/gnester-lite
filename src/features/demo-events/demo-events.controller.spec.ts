// CN: 测试文件，验证 demo-events 的行为契约；EN: Test file verifies behavior contracts for demo-events.
import { Test, TestingModule } from '@nestjs/testing';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventsController } from './demo-events.controller';
import { DemoEventsService } from './demo-events.service';

// CN: 测试分组：DemoEventsController；EN: Test group: DemoEventsController.
describe('DemoEventsController', () => {
  const service: jest.Mocked<
    Pick<
      DemoEventsService,
      'getOverview' | 'registerUser' | 'invalidateCache' | 'clear'
    >
  > = {
    getOverview: jest.fn(),
    registerUser: jest.fn(),
    invalidateCache: jest.fn(),
    clear: jest.fn(),
  };
  let controller: DemoEventsController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoEventsController],
      providers: [
        {
          provide: DemoEventsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoEventsController>(DemoEventsController);
  });

  // CN: 测试用例：returns the event demo overview；EN: Test case: returns the event demo overview.
  it('returns the event demo overview', () => {
    const overview = {
      events: [DEMO_EVENTS.UserRegistered],
      scenarios: ['write audit records'],
      records: [],
    };
    service.getOverview.mockReturnValueOnce(overview);

    expect(controller.getOverview()).toEqual(overview);
    expect(service.getOverview).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates user registration events to the service；EN: Test case: delegates user registration events to the service.
  it('delegates user registration events to the service', () => {
    const result = {
      scenario: 'domain event fans out to audit, notification, and trace',
      eventName: DEMO_EVENTS.UserRegistered,
      emitted: true,
      records: [],
    };
    service.registerUser.mockReturnValueOnce(result);

    expect(
      controller.registerUser({
        email: 'user@example.com',
        displayName: 'Demo User',
      }),
    ).toEqual(result);
    expect(service.registerUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      displayName: 'Demo User',
    });
  });

  // CN: 测试用例：delegates cache invalidation events to the service；EN: Test case: delegates cache invalidation events to the service.
  it('delegates cache invalidation events to the service', () => {
    const result = {
      scenario:
        'cache invalidation event fans out to cache work, audit, and trace',
      eventName: DEMO_EVENTS.CacheInvalidationRequested,
      emitted: true,
      records: [],
    };
    service.invalidateCache.mockReturnValueOnce(result);

    expect(
      controller.invalidateCache({
        cacheKey: 'demo:user:42',
        reason: 'user profile updated',
      }),
    ).toEqual(result);
    expect(service.invalidateCache).toHaveBeenCalledWith({
      cacheKey: 'demo:user:42',
      reason: 'user profile updated',
    });
  });

  // CN: 测试用例：delegates record clearing to the service；EN: Test case: delegates record clearing to the service.
  it('delegates record clearing to the service', () => {
    controller.clearRecords();

    expect(service.clear).toHaveBeenCalled();
  });
});
