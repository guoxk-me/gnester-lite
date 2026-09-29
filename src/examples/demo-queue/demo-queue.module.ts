import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Worker } from 'bullmq';

import { QueueModule } from '../../queue/queue.module.js';
import {
  DEMO_QUEUE,
  DEMO_QUEUE_FLOW_PRODUCER,
  DEMO_QUEUE_WORKER_FACTORY,
} from './demo-queue.constants.js';
import { DemoQueueController } from './demo-queue.controller.js';
import {
  DemoQueueProcessor,
  type DemoQueueWorkerFactory,
} from './demo-queue.processor.js';
import { DemoQueueService } from './demo-queue.service.js';

const demoQueueWorkerFactory: DemoQueueWorkerFactory = (processor, options) =>
  new Worker(DEMO_QUEUE, processor, options);

@Module({
  imports: [
    // AI modified: queue root configuration is explicit in the owning example.
    QueueModule,
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
