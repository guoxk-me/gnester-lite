import { Injectable } from '@nestjs/common';
import { InjectFlowProducer, InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { FlowProducer, Queue, type JobsOptions } from 'bullmq';
import { CommonQueueService } from '../../platform/infrastructure/queue/queue.service';
import {
  DEMO_QUEUE,
  DEMO_QUEUE_FLOW_PRODUCER,
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_MAX_PENDING_JOBS,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKFLOW_JOB,
} from './demo-queue.constants';
import { CreateDemoEmailJobDto } from './dto/create-demo-email-job.dto';
import { CreateDemoLongTaskJobDto } from './dto/create-demo-long-task-job.dto';
import { CreateDemoSubtaskWorkflowDto } from './dto/create-demo-subtask-workflow.dto';
import { DemoQueueJobDto } from './dto/demo-queue-job.dto';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';
import { DemoQueueStatusDto } from './dto/demo-queue-status.dto';
import { DemoQueueWorkflowDto } from './dto/demo-queue-workflow.dto';
import { DemoQueueJobData } from './demo-queue.types';

@Injectable()
export class DemoQueueService {
  constructor(
    @InjectQueue(DEMO_QUEUE)
    private readonly demoQueue: Queue<DemoQueueJobData, DemoQueueResultDto>,
    @InjectFlowProducer(DEMO_QUEUE_FLOW_PRODUCER)
    private readonly demoFlowProducer: FlowProducer,
    private readonly commonQueueService: CommonQueueService,
    private readonly configService: ConfigService,
  ) {}

  async enqueueEmail(
    createDemoEmailJobDto: CreateDemoEmailJobDto,
  ): Promise<DemoQueueJobDto> {
    const job = await this.commonQueueService.addWithinPendingCapacity(
      this.demoQueue,
      DEMO_QUEUE_SEND_EMAIL_JOB,
      {
        ...createDemoEmailJobDto,
        requestedAt: new Date().toISOString(),
      },
      DEMO_QUEUE_MAX_PENDING_JOBS,
      this.getQueueJobOptions(),
    );

    return {
      id: job.id ?? null,
      queue: DEMO_QUEUE,
      name: job.name,
      enqueuedAt: new Date(job.timestamp).toISOString(),
    };
  }

  // AI modified: exposes progress-friendly work so the queue demo shows active processing.
  async enqueueLongTask(
    createDemoLongTaskJobDto: CreateDemoLongTaskJobDto,
  ): Promise<DemoQueueJobDto> {
    const job = await this.commonQueueService.addWithinPendingCapacity(
      this.demoQueue,
      DEMO_QUEUE_LONG_TASK_JOB,
      {
        ...createDemoLongTaskJobDto,
        requestedAt: new Date().toISOString(),
      },
      DEMO_QUEUE_MAX_PENDING_JOBS,
      this.getQueueJobOptions(),
    );

    return {
      id: job.id ?? null,
      queue: DEMO_QUEUE,
      name: job.name,
      enqueuedAt: new Date(job.timestamp).toISOString(),
    };
  }

  // AI modified: uses BullMQ flow jobs to demonstrate real parent-child dependencies.
  async enqueueSubtaskWorkflow(
    createDemoSubtaskWorkflowDto: CreateDemoSubtaskWorkflowDto,
  ): Promise<DemoQueueWorkflowDto> {
    const requestedAt = new Date().toISOString();
    // AI modified: flow producers use the same finite Redis failure budget as ordinary queue commands.
    const workflow = await this.commonQueueService.runWithPendingCapacity(
      this.demoQueue,
      createDemoSubtaskWorkflowDto.subtasks.length + 1,
      DEMO_QUEUE_MAX_PENDING_JOBS,
      () =>
        this.demoFlowProducer.add({
          name: DEMO_QUEUE_WORKFLOW_JOB,
          queueName: DEMO_QUEUE,
          data: {
            workflowName: createDemoSubtaskWorkflowDto.workflowName,
            requestedAt,
          },
          opts: this.getQueueJobOptions(),
          children: createDemoSubtaskWorkflowDto.subtasks.map((subtask) => ({
            name: DEMO_QUEUE_SUBTASK_JOB,
            queueName: DEMO_QUEUE,
            data: {
              workflowName: createDemoSubtaskWorkflowDto.workflowName,
              subtaskName: subtask.name,
              durationMs: subtask.durationMs,
              requestedAt,
            },
            opts: this.getQueueJobOptions(),
          })),
        }),
    );

    return {
      id: workflow.job.id ?? null,
      queue: DEMO_QUEUE,
      name: workflow.job.name,
      enqueuedAt: new Date(workflow.job.timestamp).toISOString(),
      children: (workflow.children ?? []).map((child) => ({
        id: child.job.id ?? null,
        name: child.job.name,
      })),
    };
  }

  async getStatus(): Promise<DemoQueueStatusDto> {
    return {
      enabled: this.commonQueueService.isEnabled(),
      queue: DEMO_QUEUE,
      counts: await this.commonQueueService.getCounts(this.demoQueue),
    };
  }

  async pause(): Promise<void> {
    await this.commonQueueService.pause(this.demoQueue);
  }

  async resume(): Promise<void> {
    await this.commonQueueService.resume(this.demoQueue);
  }

  private getQueueJobOptions(): JobsOptions {
    // AI modified: FlowProducer nodes do not inherit BullModule queue defaults, so every producer carries retention explicitly.
    return {
      attempts: this.configService.getOrThrow<number>('queue.defaultAttempts'),
      backoff: {
        type: 'exponential',
        delay: this.configService.getOrThrow<number>('queue.backoffDelay'),
      },
      removeOnComplete: this.configService.getOrThrow<number>(
        'queue.removeOnComplete',
      ),
      removeOnFail: this.configService.getOrThrow<number>('queue.removeOnFail'),
    };
  }
}
