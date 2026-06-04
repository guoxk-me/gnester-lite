import { Global, Module } from '@nestjs/common';
import { CommonScheduleService } from './schedule.service';

// CN: 定时任务模块暴露任务运行状态；EN: Schedule module exposes job runtime state.
@Global()
@Module({
  providers: [CommonScheduleService],
  exports: [CommonScheduleService],
})
export class CommonScheduleModule {}
