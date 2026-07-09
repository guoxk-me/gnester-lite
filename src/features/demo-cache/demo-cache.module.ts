import { Module } from '@nestjs/common';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

// CN: 演示缓存读写、更新和失效；EN: Demonstrates cache reads, writes, updates, and invalidation.
@Module({
  controllers: [DemoCacheController],
  providers: [DemoCacheService],
})
export class DemoCacheModule {}
