import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import { ApiResponse, ApiResponseSchemaHost } from '@nestjs/swagger';

import { SkipApiEnvelope } from '../../common/http/skip-api-envelope.decorator.js';
import { SkipHttpThrottle } from '../../common/http/skip-http-throttle.decorator.js';
import { ApplicationReadinessService } from './application-readiness.service.js';
import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';

const healthCheckResponseSchema: ApiResponseSchemaHost['schema'] = {
  type: 'object',
  required: ['status', 'info', 'error', 'details'],
  properties: {
    status: { type: 'string', enum: ['ok'] },
    info: { type: 'object', additionalProperties: { type: 'object' } },
    error: { type: 'object', additionalProperties: { type: 'object' } },
    details: { type: 'object', additionalProperties: { type: 'object' } },
  },
};

// AI modified: VERSION_NEUTRAL so probes stay at /health/* (not /v1/health/*) matching README.
// AI modified: infrastructure probes must not consume or share user request budgets.
@SkipHttpThrottle()
@SkipApiEnvelope()
@Controller({
  version: VERSION_NEUTRAL,
  path: 'health',
})
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly applicationReadinessService: ApplicationReadinessService,
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  // AI modified: HealthCheckResult is an interface, so declare its observable schema.
  @ApiResponse({ status: 200, schema: healthCheckResponseSchema })
  checkLiveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () =>
        Promise.resolve({
          app: {
            status: 'up',
          },
        }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  // AI modified: expose the dependency-down response that Terminus returns.
  @ApiResponse({
    status: 503,
    description:
      'Application is draining or a required dependency readiness check failed',
  })
  @ApiResponse({ status: 200, schema: healthCheckResponseSchema })
  checkReadiness(): Promise<HealthCheckResult> {
    if (!this.applicationReadinessService.isReadyForTraffic()) {
      // AI modified: draining readiness fails without touching dependencies that are about to close.
      return this.healthCheckService.check([
        () => this.applicationReadinessService.checkReadiness(),
      ]);
    }

    return this.healthCheckService.check([
      () => this.applicationReadinessService.checkReadiness(),
      () => this.databaseHealthIndicator.pingCheck('database'),
      // AI modified: Redis is a required cache/queue dependency and must participate in readiness.
      () => this.redisHealthIndicator.pingCheck('redis'),
    ]);
  }
}
