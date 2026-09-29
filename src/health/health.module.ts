import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CacheModule } from '../cache/cache.module.js';
import { ApplicationReadinessService } from './application-readiness.service.js';
import { DatabaseHealthIndicator } from './database-health.indicator.js';
import { DependencyHealthDiagnosticsService } from './dependency-health-diagnostics.service.js';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';

@Module({
  // AI modified: dependency diagnostics replace Terminus's unbounded per-probe error log.
  imports: [
    // AI modified: readiness declares its Redis dependency instead of relying on a global module.
    CacheModule,
    TerminusModule.forRoot({ logger: false }),
  ],
  controllers: [HealthController],
  providers: [
    ApplicationReadinessService,
    DatabaseHealthIndicator,
    DependencyHealthDiagnosticsService,
    RedisHealthIndicator,
  ],
  exports: [ApplicationReadinessService],
})
export class HealthModule {}
