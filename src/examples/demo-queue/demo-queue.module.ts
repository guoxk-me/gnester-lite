import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Worker } from 'bullmq';

import { CommonQueueModule } from '../../platform/infrastructure/queue/queue.module';
import {
  DEMO_QUEUE,
  DEMO_QUEUE_FLOW_PRODUCER,
  DEMO_QUEUE_WORKER_FACTORY,
} from './demo-queue.constants';
import { DemoQueueController } from './demo-queue.controller';
import {
  DemoQueueProcessor,
  type DemoQueueWorkerFactory,
} from './demo-queue.processor';
import { DemoQueueService } from './demo-queue.service';

const demoQueueWorkerFactory: DemoQueueWorkerFactory = (processor, options) =>
  new Worker(DEMO_QUEUE, processor, options);

@Module({
  imports: [
    // AI modified: queue root configuration is explicit in the owning example.
    CommonQueueModule,
    BullModule.registerQueue({
      name: DEMO_QUEUE,
    }),
    BullModule.registerFlowProducer({
      name: DEMO_QUEUE_FLOW_PRODUCER,
    }),
  ],
  controllers: [DemoQueueController],
  providers: [
    DemoQueueService,
    DemoQueueProcessor,
    {
      provide: DEMO_QUEUE_WORKER_FACTORY,
      useValue: demoQueueWorkerFactory,
    },
  ],
})
export class DemoQueueModule {}
