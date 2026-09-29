import { Module } from '@nestjs/common';

import { CacheModule } from '../../cache/cache.module.js';
import { DemoCacheController } from './demo-cache.controller.js';
import { DemoCacheService } from './demo-cache.service.js';

@Module({
  // AI modified: the example declares the cache capability it injects.
  imports: [CacheModule],
  controllers: [DemoCacheController],
  providers: [DemoCacheService],
})
export class DemoCacheModule {}
