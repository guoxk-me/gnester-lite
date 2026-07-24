// CN: 测试文件，验证 demo-rate-limit 的行为契约；EN: Test file verifies behavior contracts for demo-rate-limit.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoRateLimitController } from './demo-rate-limit.controller';
import { DemoRateLimitService } from './demo-rate-limit.service';

// CN: 测试分组：DemoRateLimitController；EN: Test group: DemoRateLimitController.
describe('DemoRateLimitController', () => {
  const service: jest.Mocked<
    Pick<
      DemoRateLimitService,
      | 'getOverview'
      | 'getDefaultScenario'
      | 'getCredentialScenario'
      | 'getSkippedScenario'
    >
  > = {
    getOverview: jest.fn(),
    getDefaultScenario: jest.fn(),
    getCredentialScenario: jest.fn(),
    getSkippedScenario: jest.fn(),
  };
  let controller: DemoRateLimitController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoRateLimitController],
      providers: [
        {
          provide: DemoRateLimitService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoRateLimitController>(DemoRateLimitController);
  });

  // CN: 测试用例：delegates overview and scenario routes to the service；EN: Test case: delegates overview and scenario routes to the service.
  it('delegates overview and scenario routes to the service', () => {
    service.getOverview.mockReturnValueOnce({
      module: 'CommonRateLimitModule',
      package: '@nestjs/throttler',
      registration: 'global APP_GUARD',
      scenarios: [],
    });
    service.getDefaultScenario.mockReturnValueOnce({
      scenario: 'default-public-api',
      strategy: 'global',
    });
    service.getCredentialScenario.mockReturnValueOnce({
      scenario: 'credential-entrypoint',
      strategy: 'short override',
    });
    service.getSkippedScenario.mockReturnValueOnce({
      scenario: 'health-check',
      strategy: 'skip',
    });

    expect(controller.getOverview()).toEqual({
      module: 'CommonRateLimitModule',
      package: '@nestjs/throttler',
      registration: 'global APP_GUARD',
      scenarios: [],
    });
    expect(controller.getDefaultScenario()).toEqual({
      scenario: 'default-public-api',
      strategy: 'global',
    });
    expect(controller.getCredentialScenario()).toEqual({
      scenario: 'credential-entrypoint',
      strategy: 'short override',
    });
    expect(controller.getSkippedScenario()).toEqual({
      scenario: 'health-check',
      strategy: 'skip',
    });

    expect(service.getOverview).toHaveBeenCalled();
    expect(service.getDefaultScenario).toHaveBeenCalled();
    expect(service.getCredentialScenario).toHaveBeenCalled();
    expect(service.getSkippedScenario).toHaveBeenCalled();
  });
});
