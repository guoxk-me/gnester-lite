import { Module } from '@nestjs/common';
import { CommonScheduleModule } from '../../platform/runtime/schedule/schedule.module';
import { DemoScheduleController } from './demo-schedule.controller';
import { DemoScheduleService } from './demo-schedule.service';

@Module({
  imports: [CommonScheduleModule],
  controllers: [DemoScheduleController],
  providers: [DemoScheduleService],
})
export class DemoScheduleModule {}
