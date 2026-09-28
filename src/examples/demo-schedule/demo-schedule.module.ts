import { Module } from '@nestjs/common';
import { ScheduleModule } from '../../schedule/schedule.module';
import { DemoScheduleController } from './demo-schedule.controller';
import { DemoScheduleService } from './demo-schedule.service';

@Module({
  imports: [ScheduleModule],
  controllers: [DemoScheduleController],
  providers: [DemoScheduleService],
})
export class DemoScheduleModule {}
