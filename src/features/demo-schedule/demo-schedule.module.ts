import { Module } from '@nestjs/common';
import { CommonScheduleModule } from '../../common/schedule/schedule.module';
import { DemoScheduleController } from './demo-schedule.controller';
import { DemoScheduleService } from './demo-schedule.service';

// CN: 演示定时任务和手动控制；EN: Demonstrates scheduled jobs and manual controls.
@Module({
  imports: [CommonScheduleModule],
  controllers: [DemoScheduleController],
  providers: [DemoScheduleService],
})
export class DemoScheduleModule {}
