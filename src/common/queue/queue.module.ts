import { Global, Module } from '@nestjs/common';
import { CommonQueueService } from './queue.service';

// CN: 队列模块提供 BullMQ 共享辅助能力；EN: Queue module provides shared BullMQ helpers.
@Global()
@Module({
  providers: [CommonQueueService],
  exports: [CommonQueueService],
})
export class CommonQueueModule {}
