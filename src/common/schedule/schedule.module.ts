import { Global, Module } from '@nestjs/common';
import { CommonScheduleService } from './schedule.service';

@Global()
@Module({
  providers: [CommonScheduleService],
  exports: [CommonScheduleService],
})
export class CommonScheduleModule {}
