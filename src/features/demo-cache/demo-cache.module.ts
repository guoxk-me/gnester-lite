import { Module } from '@nestjs/common';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

@Module({
  controllers: [DemoCacheController],
  providers: [DemoCacheService],
})
export class DemoCacheModule {}
