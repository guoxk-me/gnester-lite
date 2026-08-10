import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { CacheService } from '../../infrastructure/cache/cache.service';
import {
  DependencyHealthDiagnosticsService,
  DependencyHealthTimeoutError,
} from './dependency-health-diagnostics.service';

const REDIS_HEALTH_TIMEOUT_MS = 1_000;

@Injectable()
export class RedisHealthIndicator {
  private redisPing: Promise<void> | undefined;

  constructor(
    private readonly cacheService: CacheService,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly dependencyHealthDiagnostics: DependencyHealthDiagnosticsService,
  ) {}

  async pingCheck(key: string = 'redis'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const startedAtMs = performance.now();

    try {
      await this.getRedisPing();
      this.dependencyHealthDiagnostics.reportRecovery(
        'redis',
        performance.now() - startedAtMs,
      );
      return indicator.up();
    } catch (failure) {
      // AI modified: report only closed-set Redis failure diagnostics before returning the sanitized body.
      this.dependencyHealthDiagnostics.reportFailure(
        'redis',
        failure,
        performance.now() - startedAtMs,
      );
      return indicator.down('Redis ping failed');
    }
  }

  private getRedisPing(): Promise<void> {
    if (this.redisPing) {
      return this.redisPing;
    }

    // AI modified: callers share one timed result so a single attempt has one failure class.
    const redisPing = this.pingRedisWithinReadinessBudget();
    this.redisPing = redisPing;
    void redisPing
      .finally(() => {
        if (this.redisPing === redisPing) {
          this.redisPing = undefined;
        }
      })
      .catch(() => undefined);

    return redisPing;
  }

  private async pingRedisWithinReadinessBudget(): Promise<void> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new DependencyHealthTimeoutError());
      }, REDIS_HEALTH_TIMEOUT_MS);
      timeout.unref();
    });

    try {
      // AI modified: readiness gets a finite Redis dependency budget instead of hanging.
      await Promise.race([
        this.cacheService.ping(REDIS_HEALTH_TIMEOUT_MS),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
