// CN: 处理器，执行 demo-queue 的后台任务；EN: Processor executes background jobs for demo-queue.
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DEMO_QUEUE, DEMO_QUEUE_SEND_EMAIL_JOB } from './demo-queue.constants';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';
import { DemoEmailJobData } from './demo-queue.types';

@Processor(DEMO_QUEUE)
export class DemoQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(DemoQueueProcessor.name);

  // CN: 处理 demo-queue 的 process 后台任务；EN: Processes the process background job for demo-queue.
  async process(
    job: Job<DemoEmailJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    switch (job.name) {
      case DEMO_QUEUE_SEND_EMAIL_JOB:
        return this.handleEmail(job);
      default:
        throw new Error(`Unsupported demo queue job "${job.name}"`);
    }
  }

  // CN: 处理 demo-queue 的 on completed 后台任务；EN: Processes the on completed background job for demo-queue.
  @OnWorkerEvent('completed')
  onCompleted(job: Job<DemoEmailJobData, DemoQueueResultDto, string>): void {
    this.logger.log(`Demo queue job completed: ${job.name}#${job.id}`);
  }

  // CN: 处理 demo-queue 的 on failed 后台任务；EN: Processes the on failed background job for demo-queue.
  @OnWorkerEvent('failed')
  onFailed(
    job: Job<DemoEmailJobData, DemoQueueResultDto, string> | undefined,
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
}
