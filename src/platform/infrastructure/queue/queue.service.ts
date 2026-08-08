import { randomUUID } from 'node:crypto';

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, JobsOptions, JobType, Queue } from 'bullmq';
import { QUEUE_OPERATION_TIMEOUT_MS } from './queue-connection';
import type { QueueCounts } from './queue-counts.type';

const QUEUE_COUNT_TYPES = [
  'waiting',
  'active',
  'completed',
  'failed',
  'delayed',
  'prioritized',
  'paused',
  'waiting-children',
] satisfies JobType[];
const QUEUE_PENDING_TYPES = [
  'waiting',
  'active',
  'delayed',
  'prioritized',
  'paused',
  'waiting-children',
] satisfies JobType[];
const QUEUE_ADMISSION_LOCK_TTL_MS = QUEUE_OPERATION_TIMEOUT_MS + 2_000;
const QUEUE_ADMISSION_WAIT_MS = 1_000;
const QUEUE_ADMISSION_RETRY_MS = 25;
const ACQUIRE_QUEUE_ADMISSION_COMMAND = 'gnesterAcquireQueueAdmission';
const RELEASE_QUEUE_ADMISSION_COMMAND = 'gnesterReleaseQueueAdmission';
const ACQUIRE_QUEUE_ADMISSION_SCRIPT = `
if redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2], 'NX') then
  return 1
end
return 0
`;
const RELEASE_QUEUE_ADMISSION_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export interface AddableQueue<
  JobPayload,
  JobOutcome,
  QueueJobName extends string,
> {
  add(
    name: QueueJobName,
    data: JobPayload,
    options?: JobsOptions,
  ): Promise<Job<JobPayload, JobOutcome, QueueJobName>>;
}

@Injectable()
export class CommonQueueService {
  private readonly logger = new Logger(CommonQueueService.name);
  private readonly admissionScriptClients = new WeakSet<object>();

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('queue.enabled');
  }

  async add<JobPayload, JobOutcome, QueueJobName extends string>(
    queue: AddableQueue<JobPayload, JobOutcome, QueueJobName>,
    name: QueueJobName,
    data: JobPayload,
    options?: JobsOptions,
  ): Promise<Job<JobPayload, JobOutcome, QueueJobName>> {
    return this.perform(() => queue.add(name, data, options));
  }

  async addWithinPendingCapacity<
    JobPayload,
    JobOutcome,
    QueueJobName extends string,
  >(
    queue: Queue<JobPayload, JobOutcome, QueueJobName>,
    name: QueueJobName,
    data: JobPayload,
    maximumPendingJobs: number,
    options?: JobsOptions,
  ): Promise<Job<JobPayload, JobOutcome, QueueJobName>> {
    const addableQueue = queue as unknown as AddableQueue<
      JobPayload,
      JobOutcome,
      QueueJobName
    >;

    return this.runWithPendingCapacity(queue, 1, maximumPendingJobs, () =>
      addableQueue.add(name, data, options),
    );
  }

  async runWithPendingCapacity<OperationOutcome>(
    queue: Queue,
    requiredSlots: number,
    maximumPendingJobs: number,
    operation: () => Promise<OperationOutcome>,
  ): Promise<OperationOutcome> {
    this.assertPositiveCapacity(requiredSlots, 'required queue slots');
    this.assertPositiveCapacity(maximumPendingJobs, 'maximum pending jobs');

    if (requiredSlots > maximumPendingJobs) {
      throw new ServiceUnavailableException(
        'Requested workflow exceeds the queue pending capacity',
      );
    }

    return this.perform(async () => {
      const client = await queue.client;
      this.registerAdmissionScripts(client);
      const lockKey = queue.toKey('admission-lock');
      const lockToken = randomUUID();

      await this.acquireAdmissionLock(client, lockKey, lockToken);

      try {
        const pendingJobs = await queue.getJobCountByTypes(
          ...QUEUE_PENDING_TYPES,
        );

        if (pendingJobs + requiredSlots > maximumPendingJobs) {
          throw new ServiceUnavailableException(
            `Queue pending capacity of ${maximumPendingJobs} jobs is exhausted`,
          );
        }

        // AI modified: serialize count and publication across instances so concurrent producers cannot overshoot.
        return await operation();
      } finally {
        await this.releaseAdmissionLock(client, lockKey, lockToken);
      }
    });
  }

  async getCounts(queue: Queue): Promise<QueueCounts> {
    const counts = await this.perform(() =>
      queue.getJobCounts(...QUEUE_COUNT_TYPES),
    );

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      prioritized: counts.prioritized ?? 0,
      paused: counts.paused ?? 0,
      waitingChildren: counts['waiting-children'] ?? 0,
    };
  }

  async pause(queue: Queue): Promise<void> {
    await this.perform(() => queue.pause());
  }

  async resume(queue: Queue): Promise<void> {
    await this.perform(() => queue.resume());
  }

  async perform<OperationOutcome>(
    operation: () => Promise<OperationOutcome>,
  ): Promise<OperationOutcome> {
    this.assertEnabled();

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(
          new ServiceUnavailableException(
            'Queue backend did not confirm the operation within the availability budget; mutation outcome may be unknown',
          ),
        );
      }, QUEUE_OPERATION_TIMEOUT_MS);
      timeout.unref();
    });

    try {
      // AI modified: HTTP-facing queue work has a finite failure budget during Redis outages.
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('Queue backend is unavailable', {
        cause: error,
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Queue processing is disabled');
    }
  }

  private registerAdmissionScripts(client: Awaited<Queue['client']>): void {
    if (this.admissionScriptClients.has(client)) {
      return;
    }

    client.defineCommand(ACQUIRE_QUEUE_ADMISSION_COMMAND, {
      numberOfKeys: 1,
      lua: ACQUIRE_QUEUE_ADMISSION_SCRIPT,
    });
    client.defineCommand(RELEASE_QUEUE_ADMISSION_COMMAND, {
      numberOfKeys: 1,
      lua: RELEASE_QUEUE_ADMISSION_SCRIPT,
    });
    this.admissionScriptClients.add(client);
  }

  private async acquireAdmissionLock(
    client: Awaited<Queue['client']>,
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    const waitDeadline = Date.now() + QUEUE_ADMISSION_WAIT_MS;

    do {
      const lockReply: unknown = await client.runCommand(
        ACQUIRE_QUEUE_ADMISSION_COMMAND,
        [lockKey, lockToken, String(QUEUE_ADMISSION_LOCK_TTL_MS)],
      );

      if (Number(lockReply) === 1) {
        return;
      }

      if (Date.now() >= waitDeadline) {
        break;
      }

      await this.waitForAdmissionRetry();
    } while (Date.now() < waitDeadline);

    throw new ServiceUnavailableException(
      'Queue admission is busy; retry the request',
    );
  }

  private async releaseAdmissionLock(
    client: Awaited<Queue['client']>,
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    try {
      await client.runCommand(RELEASE_QUEUE_ADMISSION_COMMAND, [
        lockKey,
        lockToken,
      ]);
    } catch (error) {
      // AI modified: an expiring lock-release failure cannot turn a confirmed enqueue into an apparent failure.
      try {
        this.logger.error(
          'Failed to release queue admission lock',
          error instanceof Error ? error.stack : String(error),
        );
      } catch {
        // Preserve the completed queue operation even when diagnostics fail.
      }
    }
  }

  private waitForAdmissionRetry(): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, QUEUE_ADMISSION_RETRY_MS);
      timeout.unref();
    });
  }

  private assertPositiveCapacity(capacity: number, label: string): void {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError(`${label} must be a positive integer`);
    }
  }
}
