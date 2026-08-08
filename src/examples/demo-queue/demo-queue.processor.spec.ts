import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { captureBackgroundException } from '../../platform/observability/sentry/with-sentry-isolation';
import {
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKFLOW_JOB,
} from './demo-queue.constants';
import {
  DemoQueueProcessor,
  type DemoQueueWorker,
  type DemoQueueWorkerFactory,
} from './demo-queue.processor';
import {
  DemoEmailJobData,
  DemoLongTaskJobData,
  DemoQueueJobData,
  DemoSubtaskJobData,
  DemoWorkflowJobData,
} from './demo-queue.types';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';

jest.mock('../../platform/observability/sentry/with-sentry-isolation', () => ({
  captureBackgroundException: jest.fn(),
  withSentryIsolation: jest.fn(
    <OperationOutcome>(callback: () => OperationOutcome): OperationOutcome =>
      callback(),
  ),
}));

describe('DemoQueueProcessor', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  const closeWorker = jest.fn<Promise<void>, []>();
  const registerWorkerListener = jest.fn();
  const worker = {
    close: closeWorker,
    on: registerWorkerListener,
  } as unknown as jest.Mocked<DemoQueueWorker>;
  const workerFactory = jest.fn<
    ReturnType<DemoQueueWorkerFactory>,
    Parameters<DemoQueueWorkerFactory>
  >();
  let processor: DemoQueueProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    closeWorker.mockResolvedValue(undefined);
    registerWorkerListener.mockReturnValue(worker);
    workerFactory.mockReturnValue(worker);
    processor = new DemoQueueProcessor(
      configService as unknown as ConfigService,
      workerFactory,
    );
  });

  it('starts and closes a retry-tolerant worker separately from producers', async () => {
    const values = new Map<string, unknown>([
      ['queue.enabled', true],
      ['REDIS_URL', 'redis://localhost:6379'],
      ['queue.prefix', 'gnester'],
      ['NODE_ENV', 'production'],
    ]);
    configService.getOrThrow.mockImplementation(
      (key: string) => values.get(key) as never,
    );

    processor.onModuleInit();

    expect(workerFactory).toHaveBeenCalledWith(expect.any(Function), {
      connection: {
        connectTimeout: 2_000,
        maxRetriesPerRequest: null,
        url: 'redis://localhost:6379',
      },
      prefix: 'gnester:production',
    });
    expect(registerWorkerListener).toHaveBeenCalledWith(
      'completed',
      expect.any(Function),
    );
    expect(registerWorkerListener).toHaveBeenCalledWith(
      'failed',
      expect.any(Function),
    );
    expect(registerWorkerListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );

    await processor.onModuleDestroy();
    expect(closeWorker).toHaveBeenCalledTimes(1);
  });

  it('does not start a worker when queue processing is disabled', () => {
    configService.getOrThrow.mockReturnValueOnce(false);

    processor.onModuleInit();

    expect(workerFactory).not.toHaveBeenCalled();
  });

  it('marks demo email jobs complete after updating progress', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_SEND_EMAIL_JOB,
      data: {
        to: 'user@example.com',
        subject: 'Welcome',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoEmailJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      delivered: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  it('reports progress while simulated long jobs run', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_LONG_TASK_JOB,
      data: {
        taskName: 'monthly-report',
        durationMs: 3,
        steps: 3,
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoLongTaskJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      completed: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenNthCalledWith(1, 33);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 67);
    expect(updateProgress).toHaveBeenNthCalledWith(3, 100);
  });

  it('handles workflow child jobs independently', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_SUBTASK_JOB,
      data: {
        workflowName: 'onboarding',
        subtaskName: 'send-welcome-email',
        durationMs: 1,
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoSubtaskJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      completed: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenNthCalledWith(1, 50);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 100);
  });

  it('completes workflow parent jobs after children finish', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_WORKFLOW_JOB,
      data: {
        workflowName: 'onboarding',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoWorkflowJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      workflowCompleted: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  it('rejects unknown job names instead of silently dropping work', async () => {
    const job = {
      name: 'unknown',
      data: {
        to: 'user@example.com',
        subject: 'Welcome',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress: jest.fn(),
    } as unknown as Job<DemoQueueJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported demo queue job "unknown"',
    );
  });

  it('captures worker and failed-job events without exposing payload fields', () => {
    const workerError = new Error('worker connection failed');
    const failedJobError = new Error('job failed');

    processor.onFailed(
      {
        id: '42',
        name: DEMO_QUEUE_SEND_EMAIL_JOB,
      } as Job<DemoQueueJobData, DemoQueueResultDto, string>,
      failedJobError,
    );

    expect(captureBackgroundException).toHaveBeenCalledWith(failedJobError);

    configService.getOrThrow.mockImplementation((key: string) => {
      const configuration = new Map<string, unknown>([
        ['queue.enabled', true],
        ['REDIS_URL', 'redis://localhost:6379'],
        ['queue.prefix', 'gnester'],
        ['NODE_ENV', 'test'],
      ]);

      return configuration.get(key) as never;
    });
    processor.onModuleInit();
    const registeredWorkerListeners = registerWorkerListener.mock
      .calls as unknown as Array<[string, unknown]>;
    const workerErrorListener = registeredWorkerListeners.find(
      ([eventName]) => eventName === 'error',
    )?.[1];

    if (typeof workerErrorListener !== 'function') {
      throw new Error('Expected the queue worker error listener to be set');
    }

    (workerErrorListener as (error: Error) => void)(workerError);
    expect(captureBackgroundException).toHaveBeenCalledWith(workerError);
  });
});
