import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';

import { ScheduleService } from './schedule.service.js';

// AI modified: keep scheduler initialization beside the shared schedule runtime service.
// AI modified: scheduling is opt-in and must be visible in the owning feature graph.
@Module({
  imports: [NestScheduleModule.forRoot()],
  providers: [ScheduleService],
  exports: [NestScheduleModule, ScheduleService],
})
export class ScheduleModule {}
