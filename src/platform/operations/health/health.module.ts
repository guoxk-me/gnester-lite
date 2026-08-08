import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonCacheModule } from '../../infrastructure/cache/cache.module';
import { ApplicationReadinessService } from './application-readiness.service';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { DependencyHealthDiagnosticsService } from './dependency-health-diagnostics.service';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

@Module({
  // AI modified: dependency diagnostics replace Terminus's unbounded per-probe error log.
  imports: [
    // AI modified: readiness declares its Redis dependency instead of relying on a global module.
    CommonCacheModule,
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
export class CommonHealthModule {}
