import { Module } from '@nestjs/common';
import { ScheduleModule } from '../../infra/schedule/schedule.module.js';
import { DemoScheduleController } from './demo-schedule.controller.js';
import { DemoScheduleService } from './demo-schedule.service.js';

@Module({
  imports: [ScheduleModule],
  controllers: [DemoScheduleController],
  providers: [DemoScheduleService],
})
export class DemoScheduleModule {}
