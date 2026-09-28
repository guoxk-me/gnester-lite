import { Module } from '@nestjs/common';

import { CacheModule } from '../../cache/cache.module';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

@Module({
  // AI modified: the example declares the cache capability it injects.
  imports: [CacheModule],
  controllers: [DemoCacheController],
  providers: [DemoCacheService],
})
export class DemoCacheModule {}
