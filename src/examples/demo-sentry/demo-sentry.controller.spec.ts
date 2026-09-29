import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Environment } from '../../config/config.types.js';
import { DemoSentryController } from './demo-sentry.controller.js';
import { DemoSentryService } from './demo-sentry.service.js';

describe('DemoSentryController', () => {
  const service = {
    getScenarios: vi.fn(),
    getStatus: vi.fn(),
    triggerDebugError: vi.fn<(...args: []) => never>(),
  } as Mocked<
    Pick<DemoSentryService, 'getScenarios' | 'getStatus' | 'triggerDebugError'>
  >;
  let controller: DemoSentryController;

  beforeEach(async () => {
    vi.clearAllMocks();

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
