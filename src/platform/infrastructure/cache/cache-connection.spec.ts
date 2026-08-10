import KeyvRedis, { Keyv } from '@keyv/redis';

import {
  CACHE_REDIS_COMMAND_QUEUE_LIMIT,
  CACHE_REDIS_CONNECT_TIMEOUT_MS,
  getCacheNamespace,
  getCacheRedisConnectionOptions,
} from './cache-connection';

describe('cache Redis connection policy', () => {
  it('bounds connection and offline command queue behavior without closing idle sockets', () => {
    const connectionOptions = getCacheRedisConnectionOptions(
      'redis://localhost:6379',
    );

    expect(connectionOptions).toEqual({
      commandsQueueMaxLength: CACHE_REDIS_COMMAND_QUEUE_LIMIT,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: CACHE_REDIS_CONNECT_TIMEOUT_MS,
      },
      url: 'redis://localhost:6379',
    });

    const redisStore = new KeyvRedis(connectionOptions);
    const redisClient = redisStore.client;

    if (!('options' in redisClient)) {
      throw new Error('Expected a standalone Redis client.');
    }
    expect(redisClient.options).toMatchObject(connectionOptions);
    // AI modified: node-redis socketTimeout is an idle timeout, not a per-command deadline.
    expect(connectionOptions.socket).not.toHaveProperty('socketTimeout');
  });

  it('isolates Redis namespaces by application and environment', () => {
    const developmentKey = getRedisStorageKey(
      'gnester-lite',
      'development',
      'demo-cache:item',
    );
    const productionKey = getRedisStorageKey(
      'gnester-lite',
      'production',
      'demo-cache:item',
    );
    const otherApplicationKey = getRedisStorageKey(
      'another-service',
      'production',
      'demo-cache:item',
    );

    expect(developmentKey).toContain('gnester-lite:development:cache');
    expect(developmentKey).not.toBe(productionKey);
    expect(productionKey).not.toBe(otherApplicationKey);
  });
});

function getRedisStorageKey(
  applicationName: string,
  environment: string,
  key: string,
): string {
  const redisStore = new KeyvRedis('redis://localhost:6379');
  const cacheStore = new Keyv({
    namespace: getCacheNamespace(applicationName, environment),
    store: redisStore,
  });

  return redisStore.createKeyPrefix(
    cacheStore._getKeyPrefix(key),
    redisStore.namespace,
  );
}
