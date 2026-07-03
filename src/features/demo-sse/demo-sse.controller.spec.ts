// CN: 测试文件，验证 demo-sse 的行为契约；EN: Test file verifies behavior contracts for demo-sse.
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DemoSseController } from './demo-sse.controller';
import { DemoSseService } from './demo-sse.service';

// CN: 测试分组：DemoSseController；EN: Test group: DemoSseController.
describe('DemoSseController', () => {
  const service: jest.Mocked<
    Pick<
      DemoSseService,
      | 'listScenarios'
      | 'streamNotifications'
      | 'streamJobProgress'
      | 'streamActivityFeed'
      | 'streamMetrics'
      | 'streamHeartbeat'
    >
  > = {
    listScenarios: jest.fn(),
    streamNotifications: jest.fn(),
    streamJobProgress: jest.fn(),
    streamActivityFeed: jest.fn(),
    streamMetrics: jest.fn(),
    streamHeartbeat: jest.fn(),
  };
  let controller: DemoSseController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoSseController],
      providers: [
        {
          provide: DemoSseService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoSseController>(DemoSseController);
  });

  // CN: 测试用例：returns the documented SSE scenarios；EN: Test case: returns the documented SSE scenarios.
  it('returns the documented SSE scenarios', () => {
    const scenarios = [
      {
        name: 'Live notifications',
        route: 'GET /demo-sse/notifications',
        eventType: 'notification',
        useCase: 'send user-visible notifications without polling',
        demonstrates: 'long-lived EventSource stream with named events',
      },
    ];
    service.listScenarios.mockReturnValueOnce(scenarios);

    expect(controller.listScenarios()).toEqual(scenarios);
    expect(service.listScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates notification streams to the service；EN: Test case: delegates notification streams to the service.
  it('delegates notification streams to the service', () => {
    const stream = of({ type: 'notification', data: { sequence: 0 } });
    service.streamNotifications.mockReturnValueOnce(stream);

    expect(controller.streamNotifications()).toBe(stream);
    expect(service.streamNotifications).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates job progress streams to the service；EN: Test case: delegates job progress streams to the service.
  it('delegates job progress streams to the service', () => {
    const stream = of({ type: 'job.progress', data: { progress: 0 } });
    service.streamJobProgress.mockReturnValueOnce(stream);

    expect(controller.streamJobProgress()).toBe(stream);
    expect(service.streamJobProgress).toHaveBeenCalled();
  });
});
