import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DemoSseController } from './demo-sse.controller';
import { DemoSseService } from './demo-sse.service';

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

  it('delegates notification streams to the service', () => {
    const stream = of({ type: 'notification', data: { sequence: 0 } });
    service.streamNotifications.mockReturnValueOnce(stream);

    expect(controller.streamNotifications()).toBe(stream);
    expect(service.streamNotifications).toHaveBeenCalled();
  });

  it('delegates job progress streams to the service', () => {
    const stream = of({ type: 'job.progress', data: { progress: 0 } });
    service.streamJobProgress.mockReturnValueOnce(stream);

    expect(controller.streamJobProgress()).toBe(stream);
    expect(service.streamJobProgress).toHaveBeenCalled();
  });
});
