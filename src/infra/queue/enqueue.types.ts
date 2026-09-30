import type { JobsOptions, Job } from 'bullmq';

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
