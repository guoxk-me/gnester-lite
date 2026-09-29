import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SKIP_HTTP_THROTTLE_KEY } from '../../rate-limit/skip-http-throttle.decorator.js';
import { DemoRateLimitController } from './demo-rate-limit.controller.js';
import { DemoRateLimitService } from './demo-rate-limit.service.js';

describe('DemoRateLimitController', () => {
  const service = {
    getOverview: vi.fn(),
    getDefaultScenario: vi.fn(),
    getCredentialScenario: vi.fn(),
    getSkippedScenario: vi.fn(),
  } as Mocked<
    Pick<
      DemoRateLimitService,
      | 'getOverview'
      | 'getDefaultScenario'
      | 'getCredentialScenario'
      | 'getSkippedScenario'
    >
  >;
  let controller: DemoRateLimitController;

  beforeEach(async () => {
    vi.clearAllMocks();

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

  it('delegates overview and scenario routes to the service', () => {
    service.getOverview.mockReturnValueOnce({
      module: 'RateLimitModule',
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
      module: 'RateLimitModule',
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

  it('marks the health example to skip all configured budgets', () => {
    const handler = Object.getOwnPropertyDescriptor(
      DemoRateLimitController.prototype,
      'getSkippedScenario',
    )?.value as object;

    expect(Reflect.getMetadata(SKIP_HTTP_THROTTLE_KEY, handler)).toBe(true);
  });
});
