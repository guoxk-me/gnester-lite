import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DEMO_QUEUE } from './demo-queue.constants';
import { DemoQueueController } from './demo-queue.controller';
import { DemoQueueProcessor } from './demo-queue.processor';
import { DemoQueueService } from './demo-queue.service';

// CN: 演示后台队列任务；EN: Demonstrates background queue jobs.
@Module({
  imports: [
    BullModule.registerQueue({
      name: DEMO_QUEUE,
    }),
  ],
  controllers: [DemoQueueController],
  providers: [DemoQueueService, DemoQueueProcessor],
})
export class DemoQueueModule {}
