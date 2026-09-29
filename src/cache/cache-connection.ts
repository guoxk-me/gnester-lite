import type { RedisClientOptions } from '@keyv/redis';

export const CACHE_REDIS_CONNECT_TIMEOUT_MS = 2_000;
export const CACHE_REDIS_COMMAND_QUEUE_LIMIT = 100;
export const CACHE_OPERATION_TIMEOUT_MS = 3_000;

export function getCacheNamespace(
  applicationName: string,
  environment: string,
): string {
  return `${applicationName}:${environment}:cache`;
}

export function getCacheRedisConnectionOptions(
  redisUrl: string,
): RedisClientOptions {
  return {
    url: redisUrl,
    commandsQueueMaxLength: CACHE_REDIS_COMMAND_QUEUE_LIMIT,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: CACHE_REDIS_CONNECT_TIMEOUT_MS,
    },
  };
}
