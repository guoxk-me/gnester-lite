import { Global, Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';

import { CommonScheduleService } from './schedule.service';

// AI modified: keep scheduler initialization beside the shared schedule runtime service.
@Global()
@Module({
  imports: [NestScheduleModule.forRoot()],
  providers: [CommonScheduleService],
  exports: [NestScheduleModule, CommonScheduleService],
})
export class CommonScheduleModule {}
