import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import type { Cache } from 'cache-manager';

import { CACHE_OPERATION_TIMEOUT_MS } from './cache-connection';

const SET_INDEXED_VALUE_SCRIPT = `
local maximumEntries = tonumber(ARGV[4])
if maximumEntries > 0
  and redis.call('SISMEMBER', KEYS[2], ARGV[3]) == 0
  and redis.call('SCARD', KEYS[2]) >= maximumEntries then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1])
if tonumber(ARGV[2]) > 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
redis.call('SADD', KEYS[2], ARGV[3])
return 1
`;

const DELETE_INDEXED_VALUE_SCRIPT = `
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[1])
return 1
`;

const REMOVE_MISSING_INDEX_MEMBER_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  return redis.call('SREM', KEYS[2], ARGV[1])
end
return 0
`;

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async get<CachedValue>(key: string): Promise<CachedValue | undefined> {
    return this.completeWithinAvailabilityBudget(() =>
      this.cacheManager.get<CachedValue>(key),
    );
  }

  async set<CachedValue>(
    key: string,
    value: CachedValue,
    ttl?: number,
  ): Promise<void> {
    await this.completeWithinAvailabilityBudget(() =>
      this.cacheManager.set(key, value, ttl ?? this.getDefaultTtl()),
    );
  }

  async remember<CachedValue>(
    key: string,
    factory: () => Promise<CachedValue>,
    ttl?: number,
  ): Promise<CachedValue> {
    const cachedValue = await this.get<CachedValue>(key);

    if (cachedValue !== undefined && cachedValue !== null) {
      return cachedValue;
    }

    const value = await factory();
    await this.set(key, value, ttl);

    return value;
  }

  async del(key: string): Promise<void> {
    await this.completeWithinAvailabilityBudget(() =>
      this.cacheManager.del(key),
    );
  }

  async clear(): Promise<void> {
    await this.completeWithinAvailabilityBudget(() =>
      this.cacheManager.clear(),
    );
  }

  async setIndexedValue(
    indexKey: string,
    indexMember: string,
    itemKey: string,
    value: string,
    options: {
      readonly maximumEntries?: number;
      readonly ttl?: number;
    } = {},
  ): Promise<boolean> {
    const { cacheStore, redisStore } = this.getRedisStore();
    const effectiveTtl = options.ttl ?? this.getDefaultTtl();
    const maximumEntries = options.maximumEntries ?? 0;

    if (
      !Number.isSafeInteger(maximumEntries) ||
      maximumEntries < 0 ||
      !Number.isSafeInteger(effectiveTtl) ||
      effectiveTtl < 0
    ) {
      throw new RangeError('Cache entry and TTL limits must be non-negative');
    }

    const expires = effectiveTtl > 0 ? Date.now() + effectiveTtl : undefined;
    const serializedValue = await cacheStore.serializeData({
      value,
      expires,
    });

    if (typeof serializedValue !== 'string') {
      throw new Error('Redis cache serialization must produce a string');
    }

    const admissionReply = await this.completeWithinAvailabilityBudget(
      async () => {
        const client = await redisStore.getClient();

        // AI modified: capacity admission, item publication, and index membership share one Redis boundary.
        return client.eval(SET_INDEXED_VALUE_SCRIPT, {
          keys: [
            this.getRedisStorageKey(cacheStore, redisStore, itemKey),
            this.getRedisStorageKey(cacheStore, redisStore, indexKey),
          ],
          arguments: [
            serializedValue,
            String(effectiveTtl),
            indexMember,
            String(maximumEntries),
          ],
        });
      },
    );

    return Number(admissionReply) === 1;
  }

  async deleteIndexedValue(
    indexKey: string,
    indexMember: string,
    itemKey: string,
  ): Promise<void> {
    const { cacheStore, redisStore } = this.getRedisStore();

    await this.completeWithinAvailabilityBudget(async () => {
      const client = await redisStore.getClient();

      await client.eval(DELETE_INDEXED_VALUE_SCRIPT, {
        keys: [
          this.getRedisStorageKey(cacheStore, redisStore, itemKey),
          this.getRedisStorageKey(cacheStore, redisStore, indexKey),
        ],
        arguments: [indexMember],
      });
    });
  }

  async getIndexMembers(
    indexKey: string,
    maximumMembers: number,
  ): Promise<string[]> {
    if (!Number.isSafeInteger(maximumMembers) || maximumMembers < 1) {
      throw new RangeError('Cache index scan limit must be a positive integer');
    }

    const { cacheStore, redisStore } = this.getRedisStore();
    const storageKey = this.getRedisStorageKey(
      cacheStore,
      redisStore,
      indexKey,
    );

    return this.completeWithinAvailabilityBudget(async () => {
      const client = await redisStore.getClient();
      const indexMembers: string[] = [];
      let cursor = '0';

      do {
        const scanReply = await client.sScan(storageKey, cursor, {
          COUNT: Math.min(maximumMembers - indexMembers.length, 100),
        });
        cursor = Buffer.isBuffer(scanReply.cursor)
          ? scanReply.cursor.toString('utf8')
          : String(scanReply.cursor);

        for (const indexMember of scanReply.members) {
          indexMembers.push(
            Buffer.isBuffer(indexMember)
              ? indexMember.toString('utf8')
              : indexMember,
          );

          if (indexMembers.length === maximumMembers) {
            break;
          }
        }
      } while (cursor !== '0' && indexMembers.length < maximumMembers);

      return indexMembers;
    });
  }

  async removeIndexMemberIfItemMissing(
    indexKey: string,
    indexMember: string,
    itemKey: string,
  ): Promise<void> {
    const { cacheStore, redisStore } = this.getRedisStore();

    await this.completeWithinAvailabilityBudget(async () => {
      const client = await redisStore.getClient();

      // AI modified: re-check item existence atomically so stale reads cannot erase a concurrent create.
      await client.eval(REMOVE_MISSING_INDEX_MEMBER_SCRIPT, {
        keys: [
          this.getRedisStorageKey(cacheStore, redisStore, itemKey),
          this.getRedisStorageKey(cacheStore, redisStore, indexKey),
        ],
        arguments: [indexMember],
      });
    });
  }

  async ping(
    availabilityBudgetMs: number = CACHE_OPERATION_TIMEOUT_MS,
  ): Promise<void> {
    const { redisStore } = this.getRedisStore();

    await this.completeWithinAvailabilityBudget(async () => {
      const client = await redisStore.getClient();

      await client.ping();
    }, availabilityBudgetMs);
  }

  private async completeWithinAvailabilityBudget<OperationOutcome>(
    operation: () => Promise<OperationOutcome>,
    availabilityBudgetMs: number = CACHE_OPERATION_TIMEOUT_MS,
  ): Promise<OperationOutcome> {
    if (
      !Number.isSafeInteger(availabilityBudgetMs) ||
      availabilityBudgetMs < 1
    ) {
      throw new RangeError(
        'Cache availability budget must be a positive integer',
      );
    }

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        // AI modified: abort a silent Redis transport so written commands cannot outlive their caller.
        this.resetRedisTransport();
        reject(
          new ServiceUnavailableException(
            'Cache backend did not respond within the availability budget',
          ),
        );
      }, availabilityBudgetMs);
      timeout.unref();
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof RangeError
      ) {
        throw error;
      }

      throw new ServiceUnavailableException('Cache backend is unavailable', {
        cause: error,
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private resetRedisTransport(): void {
    try {
      const { redisStore } = this.getRedisStore();
      void redisStore.disconnect(true).catch(() => undefined);
    } catch {
      // AI modified: timeout reporting must survive a missing or already-closed cache transport.
    }
  }

  private getRedisStore(): {
    cacheStore: Cache['stores'][number];
    redisStore: KeyvRedis<unknown>;
  } {
    const cacheStore = this.cacheManager.stores[0];

    if (!cacheStore || !(cacheStore.store instanceof KeyvRedis)) {
      throw new Error('The primary cache store is not Redis-backed');
    }

    return {
      cacheStore,
      redisStore: cacheStore.store,
    };
  }

  private getRedisStorageKey(
    cacheStore: Cache['stores'][number],
    redisStore: KeyvRedis<unknown>,
    key: string,
  ): string {
    return redisStore.createKeyPrefix(
      cacheStore._getKeyPrefix(key),
      redisStore.namespace,
    );
  }

  private getDefaultTtl(): number {
    return this.configService.getOrThrow<number>('cache.ttl');
  }
}
