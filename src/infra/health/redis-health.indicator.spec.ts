import { ServiceUnavailableException } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import type { Mocked } from 'vitest';

import { CacheService } from '../cache/cache.service.js';
import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';

describe('RedisHealthIndicator', () => {
  const cacheService = {
    ping: vi.fn(),
  } as Mocked<Pick<CacheService, 'ping'>>;
  const dependencyHealthDiagnostics = {
    reportFailure: vi.fn(),
    reportRecovery: vi.fn(),
  } as Mocked<
    Pick<DependencyHealthDiagnosticsService, 'reportFailure' | 'reportRecovery'>
  >;
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
    vi.useRealTimers();
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
    vi.useFakeTimers();
    cacheService.ping.mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    const pendingCheck = indicator.pingCheck();
    const concurrentCheck = indicator.pingCheck();
    expect(cacheService.ping).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);

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
