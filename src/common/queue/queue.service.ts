// CN: 服务，承载 queue common 的业务逻辑；EN: Service holds business logic for queue common.
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, JobsOptions, JobType, Queue } from 'bullmq';
import { QueueCountsDto } from './dto/queue-counts.dto';

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

export interface AddableQueue<TData, TResult, TName extends string> {
  add(
    name: TName,
    data: TData,
    options?: JobsOptions,
  ): Promise<Job<TData, TResult, TName>>;
}

@Injectable()
export class CommonQueueService {
  // CN: 初始化 queue common 的依赖和运行状态；EN: Initializes dependencies and runtime state for queue common.
  constructor(private readonly configService: ConfigService) {}

  // CN: 执行 queue common 的 is enabled 业务逻辑；EN: Runs the is enabled business logic for queue common.
  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('queue.enabled');
  }

  // CN: 执行 queue common 的 add 业务逻辑；EN: Runs the add business logic for queue common.
  async add<TData, TResult, TName extends string>(
    queue: AddableQueue<TData, TResult, TName>,
    name: TName,
    data: TData,
    options?: JobsOptions,
  ): Promise<Job<TData, TResult, TName>> {
    this.assertEnabled();

    return queue.add(name, data, options);
  }

  // CN: 执行 queue common 的 get counts 业务逻辑；EN: Runs the get counts business logic for queue common.
  async getCounts(queue: Queue): Promise<QueueCountsDto> {
    const counts = await queue.getJobCounts(...QUEUE_COUNT_TYPES);

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

  // CN: 执行 queue common 的 pause 业务逻辑；EN: Runs the pause business logic for queue common.
  async pause(queue: Queue): Promise<void> {
    this.assertEnabled();
    await queue.pause();
  }

  // CN: 执行 queue common 的 resume 业务逻辑；EN: Runs the resume business logic for queue common.
  async resume(queue: Queue): Promise<void> {
    this.assertEnabled();
    await queue.resume();
  }

  // CN: 执行 queue common 的 assert enabled 业务逻辑；EN: Runs the assert enabled business logic for queue common.
  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Queue processing is disabled');
    }
  }
}
