import { Module } from '@nestjs/common';

import { CommonCacheModule } from '../../platform/infrastructure/cache/cache.module';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

@Module({
  // AI modified: the example declares the cache capability it injects.
  imports: [CommonCacheModule],
  controllers: [DemoCacheController],
  providers: [DemoCacheService],
})
export class DemoCacheModule {}
