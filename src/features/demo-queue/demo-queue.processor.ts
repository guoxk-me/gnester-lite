// CN: 处理器，执行 demo-queue 的后台任务；EN: Processor executes background jobs for demo-queue.
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { withSentryIsolation } from '../../common/sentry/with-sentry-isolation';
import {
  DEMO_QUEUE,
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKFLOW_JOB,
} from './demo-queue.constants';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';
import {
  DemoEmailJobData,
  DemoLongTaskJobData,
  DemoQueueJobData,
  DemoSubtaskJobData,
  DemoWorkflowJobData,
} from './demo-queue.types';

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

@Processor(DEMO_QUEUE)
export class DemoQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(DemoQueueProcessor.name);

  // CN: 处理 demo-queue 的 process 后台任务；EN: Processes the process background job for demo-queue.
  async process(
    job: Job<DemoQueueJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    // AI modified: isolate BullMQ work so breadcrumbs do not leak into HTTP errors.
    return withSentryIsolation(async () => {
      switch (job.name) {
        case DEMO_QUEUE_SEND_EMAIL_JOB:
          return this.handleEmail(
            job as Job<DemoEmailJobData, DemoQueueResultDto, string>,
          );
        case DEMO_QUEUE_LONG_TASK_JOB:
          return this.handleLongTask(
            job as Job<DemoLongTaskJobData, DemoQueueResultDto, string>,
          );
        case DEMO_QUEUE_SUBTASK_JOB:
          return this.handleSubtask(
            job as Job<DemoSubtaskJobData, DemoQueueResultDto, string>,
          );
        case DEMO_QUEUE_WORKFLOW_JOB:
          return this.handleWorkflow(
            job as Job<DemoWorkflowJobData, DemoQueueResultDto, string>,
          );
        default:
          throw new Error(`Unsupported demo queue job "${job.name}"`);
      }
    });
  }

  // CN: 处理 demo-queue 的 on completed 后台任务；EN: Processes the on completed background job for demo-queue.
  @OnWorkerEvent('completed')
  onCompleted(job: Job<DemoQueueJobData, DemoQueueResultDto, string>): void {
    this.logger.log(`Demo queue job completed: ${job.name}#${job.id}`);
  }

  // CN: 处理 demo-queue 的 on failed 后台任务；EN: Processes the on failed background job for demo-queue.
  @OnWorkerEvent('failed')
  onFailed(
    job: Job<DemoQueueJobData, DemoQueueResultDto, string> | undefined,
    error: Error,
  ): void {
    this.logger.error(
      `Demo queue job failed: ${job?.name ?? 'unknown'}#${job?.id ?? 'unknown'}`,
      error.stack,
    );
  }

  // CN: 处理 demo-queue 的 handle email 后台任务；EN: Processes the handle email background job for demo-queue.
  private async handleEmail(
    job: Job<DemoEmailJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    await job.updateProgress(100);
    this.logger.log(`Demo email job handled for ${job.data.to}`);

    return {
      delivered: true,
      handledAt: new Date().toISOString(),
    };
  }

  // AI modified: simulates step-by-step work so clients can observe progress.
  private async handleLongTask(
    job: Job<DemoLongTaskJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    const stepDurationMs = Math.ceil(job.data.durationMs / job.data.steps);

    for (let step = 1; step <= job.data.steps; step += 1) {
      await sleep(stepDurationMs);
      await job.updateProgress(Math.round((step / job.data.steps) * 100));
    }

    this.logger.log(`Demo long task handled: ${job.data.taskName}`);

    return {
      completed: true,
      handledAt: new Date().toISOString(),
    };
  }

  // AI modified: gives workflow children their own processing time and progress.
  private async handleSubtask(
    job: Job<DemoSubtaskJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    await job.updateProgress(50);
    await sleep(job.data.durationMs);
    await job.updateProgress(100);
    this.logger.log(
      `Demo workflow subtask handled: ${job.data.workflowName}/${job.data.subtaskName}`,
    );

    return {
      completed: true,
      handledAt: new Date().toISOString(),
    };
  }

  private async handleWorkflow(
    job: Job<DemoWorkflowJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    await job.updateProgress(100);
    this.logger.log(`Demo workflow completed: ${job.data.workflowName}`);

    return {
      workflowCompleted: true,
      handledAt: new Date().toISOString(),
    };
  }
}
