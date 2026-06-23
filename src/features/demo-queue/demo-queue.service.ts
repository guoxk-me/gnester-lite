// CN: 服务，承载 demo-queue 的业务逻辑；EN: Service holds business logic for demo-queue.
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { CommonQueueService } from '../../common/queue/queue.service';
import { DEMO_QUEUE, DEMO_QUEUE_SEND_EMAIL_JOB } from './demo-queue.constants';
import { CreateDemoEmailJobDto } from './dto/create-demo-email-job.dto';
import { DemoQueueJobDto } from './dto/demo-queue-job.dto';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';
import { DemoQueueStatusDto } from './dto/demo-queue-status.dto';
import { DemoEmailJobData } from './demo-queue.types';

@Injectable()
export class DemoQueueService {
  // CN: 初始化 demo-queue 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-queue.
  constructor(
    @InjectQueue(DEMO_QUEUE)
    private readonly demoQueue: Queue<DemoEmailJobData, DemoQueueResultDto>,
    private readonly commonQueueService: CommonQueueService,
    private readonly configService: ConfigService,
  ) {}

  // CN: 执行 demo-queue 的 enqueue email 业务逻辑；EN: Runs the enqueue email business logic for demo-queue.
  async enqueueEmail(
    createDemoEmailJobDto: CreateDemoEmailJobDto,
  ): Promise<DemoQueueJobDto> {
    const job = await this.commonQueueService.add(
      this.demoQueue,
      DEMO_QUEUE_SEND_EMAIL_JOB,
      {
        ...createDemoEmailJobDto,
        requestedAt: new Date().toISOString(),
      },
      {
        attempts: this.configService.getOrThrow<number>(
          'queue.defaultAttempts',
        ),
        backoff: {
          type: 'exponential',
          delay: this.configService.getOrThrow<number>('queue.backoffDelay'),
        },
      },
    );

    return {
      id: job.id ?? null,
      queue: DEMO_QUEUE,
      name: job.name,
      enqueuedAt: new Date(job.timestamp).toISOString(),
    };
  }

  // CN: 执行 demo-queue 的 get status 业务逻辑；EN: Runs the get status business logic for demo-queue.
  async getStatus(): Promise<DemoQueueStatusDto> {
    return {
      enabled: this.commonQueueService.isEnabled(),
      queue: DEMO_QUEUE,
      counts: await this.commonQueueService.getCounts(this.demoQueue),
    };
  }

  // CN: 执行 demo-queue 的 pause 业务逻辑；EN: Runs the pause business logic for demo-queue.
  async pause(): Promise<void> {
    await this.commonQueueService.pause(this.demoQueue);
  }

  // CN: 执行 demo-queue 的 resume 业务逻辑；EN: Runs the resume business logic for demo-queue.
  async resume(): Promise<void> {
    await this.commonQueueService.resume(this.demoQueue);
  }
}
