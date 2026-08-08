import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, type WorkerOptions } from 'bullmq';
import { getQueueWorkerConnectionOptions } from '../../platform/infrastructure/queue/queue-connection';
import {
  captureBackgroundException,
  withSentryIsolation,
} from '../../platform/observability/sentry/with-sentry-isolation';
import {
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKER_FACTORY,
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

export interface DemoQueueWorker {
  close(): Promise<void>;
  on(
    event: 'completed',
    listener: (job: Job<DemoQueueJobData, DemoQueueResultDto, string>) => void,
  ): this;
  on(
    event: 'failed',
    listener: (
      job: Job<DemoQueueJobData, DemoQueueResultDto, string> | undefined,
      error: Error,
    ) => void,
  ): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

export type DemoQueueWorkerFactory = (
  processor: (
    job: Job<DemoQueueJobData, DemoQueueResultDto, string>,
  ) => Promise<DemoQueueResultDto>,
  options: WorkerOptions,
) => DemoQueueWorker;

@Injectable()
export class DemoQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemoQueueProcessor.name);
  private worker?: DemoQueueWorker;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DEMO_QUEUE_WORKER_FACTORY)
    private readonly workerFactory: DemoQueueWorkerFactory,
  ) {}

  onModuleInit(): void {
    if (!this.configService.getOrThrow<boolean>('queue.enabled')) {
      return;
    }

    // AI modified: the blocking worker owns a retry-tolerant connection separate from bounded HTTP producers.
    this.worker = this.workerFactory((job) => this.process(job), {
      connection: getQueueWorkerConnectionOptions(
        this.configService.getOrThrow<string>('REDIS_URL'),
      ),
      prefix: `${this.configService.getOrThrow<string>('queue.prefix')}:${this.configService.getOrThrow<string>('NODE_ENV')}`,
    });
    this.worker.on('completed', (job) => this.onCompleted(job));
    this.worker.on('failed', (job, error) => this.onFailed(job, error));
    this.worker.on('error', (error) => {
      this.reportWorkerFailure('Demo queue worker error', error);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    this.worker = undefined;
  }

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

  onCompleted(job: Job<DemoQueueJobData, DemoQueueResultDto, string>): void {
    this.logger.log(`Demo queue job completed: ${job.name}#${job.id}`);
  }

  onFailed(
    job: Job<DemoQueueJobData, DemoQueueResultDto, string> | undefined,
    error: Error,
  ): void {
    this.reportWorkerFailure(
      `Demo queue job failed: ${job?.name ?? 'unknown'}#${job?.id ?? 'unknown'}`,
      error,
    );
  }

  private reportWorkerFailure(message: string, error: Error): void {
    // AI modified: BullMQ failures remain visible even when they occur outside an HTTP exception boundary.
    captureBackgroundException(error);

    try {
      this.logger.error(message, error.stack);
    } catch {
      // Observability failures cannot escape the worker event boundary.
    }
  }

  private async handleEmail(
    job: Job<DemoEmailJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    await job.updateProgress(100);
    // AI modified: job logs identify execution without copying recipient or other user-controlled payloads.
    this.logger.log(`Demo email job handled: ${job.name}#${job.id}`);

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

    this.logger.log(`Demo long task handled: ${job.name}#${job.id}`);

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
    this.logger.log(`Demo workflow subtask handled: ${job.name}#${job.id}`);

    return {
      completed: true,
      handledAt: new Date().toISOString(),
    };
  }

  private async handleWorkflow(
    job: Job<DemoWorkflowJobData, DemoQueueResultDto, string>,
  ): Promise<DemoQueueResultDto> {
    await job.updateProgress(100);
    this.logger.log(`Demo workflow completed: ${job.name}#${job.id}`);

    return {
      workflowCompleted: true,
      handledAt: new Date().toISOString(),
    };
  }
}
