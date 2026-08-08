import type { ConnectionOptions } from 'bullmq';

export const QUEUE_OPERATION_TIMEOUT_MS = 3_000;

export function getQueueProducerConnectionOptions(
  redisUrl: string,
  isTestEnvironment: boolean,
): ConnectionOptions {
  return {
    url: redisUrl,
    lazyConnect: isTestEnvironment,
    connectTimeout: 2_000,
    commandTimeout: QUEUE_OPERATION_TIMEOUT_MS,
    // AI modified: recycle a socket whose pending command stalled; ioredis does not arm this timer while truly idle.
    socketTimeout: QUEUE_OPERATION_TIMEOUT_MS,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    // AI modified: timed-out producer commands must not be replayed after Redis reconnects.
    autoResendUnfulfilledCommands: false,
    retryStrategy: (retryAttempts): number =>
      Math.min(retryAttempts * 100, 1_000),
  };
}

export function getQueueWorkerConnectionOptions(
  redisUrl: string,
): ConnectionOptions {
  return {
    url: redisUrl,
    connectTimeout: 2_000,
    // AI modified: BullMQ workers need an unbounded request retry policy for blocking reads.
    maxRetriesPerRequest: null,
  };
}
