import { Test, TestingModule } from '@nestjs/testing';
import { Environment } from 'config/config.types';
import { DemoSentryController } from './demo-sentry.controller';
import { DemoSentryService } from './demo-sentry.service';

describe('DemoSentryController', () => {
  const service: jest.Mocked<
    Pick<DemoSentryService, 'getScenarios' | 'getStatus' | 'triggerDebugError'>
  > = {
    getScenarios: jest.fn(),
    getStatus: jest.fn(),
    triggerDebugError: jest.fn<never, []>(),
  };
  let controller: DemoSentryController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoSentryController],
      providers: [
        {
          provide: DemoSentryService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoSentryController>(DemoSentryController);
  });

  it('delegates scenario and status routes to the service', () => {
    const scenarios = [
      {
        name: 'status',
        path: 'GET /demo-sentry/status',
        purpose: 'Show Sentry wiring status.',
      },
    ];
    const status = {
      enabled: false,
      hasDsn: false,
      environment: Environment.Development,
      tracesSampleRate: null,
      notes: [],
    };

    service.getScenarios.mockReturnValueOnce(scenarios);
    service.getStatus.mockReturnValueOnce(status);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(controller.getStatus()).toEqual(status);
    expect(service.getScenarios).toHaveBeenCalled();
    expect(service.getStatus).toHaveBeenCalled();
  });

  it('delegates the deliberate debug failure to the service', () => {
    service.triggerDebugError.mockImplementationOnce((): never => {
      throw new Error('My first Sentry error!');
    });

    expect(() => controller.getDebugSentry()).toThrow('My first Sentry error!');
    expect(service.triggerDebugError).toHaveBeenCalled();
  });
});
