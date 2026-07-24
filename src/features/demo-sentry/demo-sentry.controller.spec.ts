// CN: 测试文件，验证 demo-sentry 的行为契约；EN: Test file verifies behavior contracts for demo-sentry.
import { Test, TestingModule } from '@nestjs/testing';
import { Environment } from 'config/config.types';
import { DemoSentryController } from './demo-sentry.controller';
import { DemoSentryService } from './demo-sentry.service';

// CN: 测试分组：DemoSentryController；EN: Test group: DemoSentryController.
describe('DemoSentryController', () => {
  const service: jest.Mocked<
    Pick<DemoSentryService, 'getScenarios' | 'getStatus' | 'triggerDebugError'>
  > = {
    getScenarios: jest.fn(),
    getStatus: jest.fn(),
    triggerDebugError: jest.fn(),
  };
  let controller: DemoSentryController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：delegates scenario and status routes to the service；EN: Test case: delegates scenario and status routes to the service.
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

  // CN: 测试用例：delegates the deliberate debug failure to the service；EN: Test case: delegates the deliberate debug failure to the service.
  it('delegates the deliberate debug failure to the service', () => {
    service.triggerDebugError.mockImplementationOnce((): never => {
      throw new Error('My first Sentry error!');
    });

    expect(() => controller.getDebugSentry()).toThrow('My first Sentry error!');
    expect(service.triggerDebugError).toHaveBeenCalled();
  });
});
