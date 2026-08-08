import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

import { SKIP_HTTP_THROTTLE_KEY } from '../../security/rate-limit/skip-http-throttle.decorator';
import { ApplicationReadinessService } from './application-readiness.service';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

type HealthIndicatorResult = Record<string, { status: 'up' | 'down' }>;
type HealthIndicatorFunction = () =>
  | PromiseLike<HealthIndicatorResult>
  | HealthIndicatorResult;

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

describe('HealthController', () => {
  let controller: HealthController;
  let applicationReadinessService: ApplicationReadinessService;
  let healthCheckService: {
    check: jest.Mock<Promise<HealthCheckResult>, [HealthIndicatorFunction[]]>;
  };
  let databaseHealthIndicator: {
    pingCheck: jest.Mock<Promise<HealthIndicatorResult>, [string]>;
  };
  let redisHealthIndicator: {
    pingCheck: jest.Mock<Promise<HealthIndicatorResult>, [string]>;
  };

  beforeEach(() => {
    healthCheckService = {
      check: jest.fn(async (indicators): Promise<HealthCheckResult> => {
        const indicatorResults = await Promise.all(
          indicators.map((indicator) => Promise.resolve(indicator())),
        );
        const details = mergeIndicatorResults(indicatorResults);
        const errors = Object.fromEntries(
          Object.entries(details).filter(
            ([, detail]) => detail.status === 'down',
          ),
        );

        if (Object.keys(errors).length > 0) {
          throw new ServiceUnavailableException({
            status: 'error',
            info: {},
            error: errors,
            details,
          });
        }

        return {
          status: 'ok' as const,
          info: details,
          error: {},
          details,
        };
      }),
    };
    databaseHealthIndicator = {
      pingCheck: jest.fn((key: string): Promise<HealthIndicatorResult> => {
        void key;
        return Promise.resolve({
          database: {
            status: 'up' as const,
          },
        });
      }),
    };
    redisHealthIndicator = {
      pingCheck: jest.fn((key: string): Promise<HealthIndicatorResult> => {
        void key;
        return Promise.resolve({
          redis: {
            status: 'up' as const,
          },
        });
      }),
    };
    applicationReadinessService = new ApplicationReadinessService();
    controller = new HealthController(
      healthCheckService as unknown as HealthCheckService,
      applicationReadinessService,
      databaseHealthIndicator as unknown as DatabaseHealthIndicator,
      redisHealthIndicator as unknown as RedisHealthIndicator,
    );
  });

  it('skips every configured request throttler for infrastructure probes', () => {
    expect(Reflect.getMetadata(SKIP_HTTP_THROTTLE_KEY, HealthController)).toBe(
      true,
    );
  });

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
    expect(redisHealthIndicator.pingCheck).not.toHaveBeenCalled();
  });

  it('reports readiness from the database indicator', async () => {
    await expect(controller.checkReadiness()).resolves.toEqual({
      status: 'ok',
      info: {
        application: {
          status: 'up',
        },
        database: {
          status: 'up',
        },
        redis: {
          status: 'up',
        },
      },
      error: {},
      details: {
        application: {
          status: 'up',
        },
        database: {
          status: 'up',
        },
        redis: {
          status: 'up',
        },
      },
    });
    expect(databaseHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
    expect(redisHealthIndicator.pingCheck).toHaveBeenCalledWith('redis');
  });

  it('becomes unready before dependencies close while liveness stays up', async () => {
    applicationReadinessService.startDraining();

    await expect(controller.checkReadiness()).rejects.toMatchObject({
      response: {
        status: 'error',
        error: {
          application: {
            status: 'down',
            message: 'Application is draining',
          },
        },
      },
      status: 503,
    });
    await expect(controller.checkLiveness()).resolves.toMatchObject({
      status: 'ok',
      info: {
        app: {
          status: 'up',
        },
      },
    });
    expect(databaseHealthIndicator.pingCheck).not.toHaveBeenCalled();
    expect(redisHealthIndicator.pingCheck).not.toHaveBeenCalled();
  });
});
