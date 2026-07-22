// CN: 测试文件，验证 health common 的行为契约；EN: Test file verifies behavior contracts for health common.
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { HealthController } from './health.controller';

type HealthIndicatorResult = Record<string, { status: 'up' | 'down' }>;
type HealthIndicatorFunction = () =>
  | PromiseLike<HealthIndicatorResult>
  | HealthIndicatorResult;

// CN: 准备或验证 health common 的 merge indicator results 测试逻辑；EN: Prepares or verifies the merge indicator results test logic for health common.
function mergeIndicatorResults(
  results: readonly HealthIndicatorResult[],
): HealthIndicatorResult {
  return results.reduce<HealthIndicatorResult>(
    (merged, result) => ({
      ...merged,
      ...result,
    }),
    {},
  );
}

// CN: 测试分组：HealthController；EN: Test group: HealthController.
describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<Pick<HealthCheckService, 'check'>>;
  let databaseHealthIndicator: jest.Mocked<
    Pick<TypeOrmHealthIndicator, 'pingCheck'>
  >;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    healthCheckService = {
      check: jest.fn(async (indicators) => {
        const indicatorResults = await Promise.all(
          (indicators as HealthIndicatorFunction[]).map((indicator) =>
            Promise.resolve(indicator()),
          ),
        );
        const details = mergeIndicatorResults(indicatorResults);

        return {
          status: 'ok',
          info: details,
          error: {},
          details,
        };
      }),
    };
    databaseHealthIndicator = {
      pingCheck: jest.fn(() =>
        Promise.resolve({
          database: {
            status: 'up' as const,
          },
        }),
      ),
    };
    controller = new HealthController(
      healthCheckService as HealthCheckService,
      databaseHealthIndicator as TypeOrmHealthIndicator,
    );
  });

  // CN: 测试用例：reports liveness without dependency checks；EN: Test case: reports liveness without dependency checks.
  it('reports liveness without dependency checks', async () => {
    await expect(controller.checkLiveness()).resolves.toEqual({
      status: 'ok',
      info: {
        app: {
          status: 'up',
        },
      },
      error: {},
      details: {
        app: {
          status: 'up',
        },
      },
    });
    expect(databaseHealthIndicator.pingCheck).not.toHaveBeenCalled();
  });

  // CN: 测试用例：reports readiness from the database indicator；EN: Test case: reports readiness from the database indicator.
  it('reports readiness from the database indicator', async () => {
    await expect(controller.checkReadiness()).resolves.toEqual({
      status: 'ok',
      info: {
        database: {
          status: 'up',
        },
      },
      error: {},
      details: {
        database: {
          status: 'up',
        },
      },
    });
    expect(databaseHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
  });
});
