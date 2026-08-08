import { ServiceUnavailableException } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { CacheService } from '../../infrastructure/cache/cache.service';
import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service';
import { RedisHealthIndicator } from './redis-health.indicator';

describe('RedisHealthIndicator', () => {
  const cacheService: jest.Mocked<Pick<CacheService, 'ping'>> = {
    ping: jest.fn(),
  };
  const dependencyHealthDiagnostics: jest.Mocked<
    Pick<DependencyHealthDiagnosticsService, 'reportFailure' | 'reportRecovery'>
  > = {
    reportFailure: jest.fn(),
    reportRecovery: jest.fn(),
  };
  const healthIndicatorService = new HealthIndicatorService();
  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    cacheService.ping.mockReset().mockResolvedValue(undefined);
    dependencyHealthDiagnostics.reportFailure.mockReset();
    dependencyHealthDiagnostics.reportRecovery.mockReset();
    indicator = new RedisHealthIndicator(
      cacheService as unknown as CacheService,
      healthIndicatorService,
      dependencyHealthDiagnostics as unknown as DependencyHealthDiagnosticsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports Redis as ready after a successful ping', async () => {
    await expect(indicator.pingCheck()).resolves.toEqual({
      redis: {
        status: 'up',
      },
    });
    expect(cacheService.ping).toHaveBeenCalledWith(1_000);
    expect(dependencyHealthDiagnostics.reportRecovery).toHaveBeenCalledWith(
      'redis',
      expect.any(Number),
    );
    expect(dependencyHealthDiagnostics.reportFailure).not.toHaveBeenCalled();
  });

  it('reports Redis as down after a failed ping', async () => {
    const redisFailure = new ServiceUnavailableException(
      'Cache backend is unavailable',
    );
    cacheService.ping.mockRejectedValueOnce(redisFailure);

    await expect(indicator.pingCheck()).resolves.toEqual({
      redis: {
        status: 'down',
        message: 'Redis ping failed',
      },
    });
    expect(dependencyHealthDiagnostics.reportFailure).toHaveBeenCalledWith(
      'redis',
      redisFailure,
      expect.any(Number),
    );
  });

  it('reports Redis as down when the ping exceeds its readiness budget', async () => {
    jest.useFakeTimers();
    cacheService.ping.mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    const pendingCheck = indicator.pingCheck();
    const concurrentCheck = indicator.pingCheck();
    expect(cacheService.ping).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(pendingCheck).resolves.toEqual({
      redis: {
        status: 'down',
        message: 'Redis ping failed',
      },
    });
    await expect(concurrentCheck).resolves.toMatchObject({
      redis: { status: 'down' },
    });
    expect(dependencyHealthDiagnostics.reportFailure).toHaveBeenCalledTimes(2);
    for (const reportFailureCall of dependencyHealthDiagnostics.reportFailure
      .mock.calls) {
      expect(reportFailureCall).toEqual([
        'redis',
        expect.any(DependencyHealthTimeoutError),
        1_000,
      ]);
    }
    const [firstFailureReport, concurrentFailureReport] =
      dependencyHealthDiagnostics.reportFailure.mock.calls;
    expect(concurrentFailureReport?.[1]).toBe(firstFailureReport?.[1]);

    await expect(indicator.pingCheck()).resolves.toMatchObject({
      redis: { status: 'up' },
    });
    expect(cacheService.ping).toHaveBeenCalledTimes(2);
  });
});
