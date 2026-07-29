import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import KeyvRedis, { Keyv } from '@keyv/redis';
import type { Cache } from 'cache-manager';
import { getCacheNamespace } from './cache-connection';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  type CacheManagerMethods = 'get' | 'set' | 'del' | 'clear';

  const cacheManager: jest.Mocked<Record<CacheManagerMethods, jest.Mock>> = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  let service: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue(60000);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('returns cached values without calling the factory', async () => {
    cacheManager.get.mockResolvedValue({ id: 1 });
    const factory = jest.fn();

    await expect(service.remember('demo:1', factory)).resolves.toEqual({
      id: 1,
    });

    expect(factory).not.toHaveBeenCalled();
  });

  it('stores factory results using the configured cache ttl', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    const factory = jest.fn().mockResolvedValue({ id: 2 });

    await expect(service.remember('demo:2', factory)).resolves.toEqual({
      id: 2,
    });

    expect(configService.getOrThrow).toHaveBeenCalledWith('cache.ttl');
    expect(cacheManager.set).toHaveBeenCalledWith('demo:2', { id: 2 }, 60000);
  });

  it('allows per-call ttl overrides', async () => {
    await service.set('demo:3', { id: 3 }, 1000);

    expect(cacheManager.set).toHaveBeenCalledWith('demo:3', { id: 3 }, 1000);
  });

  it('deletes a single cache key', async () => {
    await service.del('demo:4');

    expect(cacheManager.del).toHaveBeenCalledWith('demo:4');
  });

  it('clears every cache key', async () => {
    await service.clear();

    expect(cacheManager.clear).toHaveBeenCalled();
  });

  describe('Redis indexed operations', () => {
    const redisClient = {
      eval: jest.fn(),
      ping: jest.fn(),
      sScan: jest.fn(),
    };
    let redisStore: KeyvRedis<unknown>;
    let cacheStore: Keyv<string>;
    let indexedCacheManager: Cache;
    let indexedService: CacheService;

    beforeEach(() => {
      redisClient.eval.mockResolvedValue(1);
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.sScan.mockResolvedValue({
        cursor: '0',
        members: [],
      });
      redisStore = new KeyvRedis('redis://127.0.0.1:6379', {
        throwOnConnectError: true,
        throwOnErrors: true,
      });
      jest
        .spyOn(redisStore, 'getClient')
        .mockResolvedValue(redisClient as never);
      cacheStore = new Keyv<string>({
        namespace: getCacheNamespace('gnester-lite', 'test'),
        store: redisStore,
        throwOnErrors: true,
      });
      indexedCacheManager = {
        clear: jest.fn(),
        del: jest.fn(),
        disconnect: jest.fn(),
        get: jest.fn(),
        mdel: jest.fn(),
        mget: jest.fn(),
        mset: jest.fn(),
        on: jest.fn(),
        set: jest.fn(),
        stores: [cacheStore],
        ttl: jest.fn(),
        wrap: jest.fn(),
      } as unknown as Cache;
      indexedService = new CacheService(
        indexedCacheManager,
        configService as unknown as ConfigService,
      );
    });

    it('serializes and writes an item with its index membership atomically', async () => {
      const now = Date.parse('2026-07-28T00:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const expectedValue = await cacheStore.serializeData({
        value: 'hello cache',
        expires: now + 60_000,
      });

      await expect(
        indexedService.setIndexedValue(
          'demo-cache:{items}:index',
          'welcome',
          'demo-cache:{items}:item:welcome',
          'hello cache',
          { maximumEntries: 100 },
        ),
      ).resolves.toBe(true);

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call('SISMEMBER'"),
        {
          keys: [
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:item:welcome',
            ),
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:index',
            ),
          ],
          arguments: [expectedValue, '60000', 'welcome', '100'],
        },
      );
      expect(
        getRedisStorageKey(
          cacheStore,
          redisStore,
          'demo-cache:{items}:item:welcome',
        ),
      ).toBe(
        'gnester-lite:test:cache::gnester-lite:test:cache:demo-cache:{items}:item:welcome',
      );
    });

    it('leaves the value unpublished when atomic capacity admission is denied', async () => {
      redisClient.eval.mockResolvedValueOnce(0);

      await expect(
        indexedService.setIndexedValue(
          'demo-cache:{items}:index',
          'new-entry',
          'demo-cache:{items}:item:new-entry',
          'not-published',
          { maximumEntries: 100 },
        ),
      ).resolves.toBe(false);

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call('SCARD'"),
        {
          keys: [
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:item:new-entry',
            ),
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:index',
            ),
          ],
          arguments: [
            expect.any(String) as string,
            '60000',
            'new-entry',
            '100',
          ],
        },
      );
    });

    it('removes stale membership only while the item key is still absent', async () => {
      await indexedService.removeIndexMemberIfItemMissing(
        'demo-cache:{items}:index',
        'welcome',
        'demo-cache:{items}:item:welcome',
      );

      expect(redisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call('EXISTS'"),
        {
          keys: [
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:item:welcome',
            ),
            getRedisStorageKey(
              cacheStore,
              redisStore,
              'demo-cache:{items}:index',
            ),
          ],
          arguments: ['welcome'],
        },
      );
    });

    it('incrementally decodes only the bounded number of Redis index members', async () => {
      redisClient.sScan.mockResolvedValueOnce({
        cursor: '7',
        members: [Buffer.from('first'), 'second', 'not-returned'],
      });

      await expect(
        indexedService.getIndexMembers('demo-cache:{items}:index', 2),
      ).resolves.toEqual(['first', 'second']);
      expect(redisClient.sScan).toHaveBeenCalledTimes(1);
    });

    it('maps Redis adapter failures to the cache availability contract', async () => {
      const redisError = new Error('Redis unavailable');
      redisClient.eval.mockRejectedValueOnce(redisError);
      await expect(
        indexedService.deleteIndexedValue(
          'demo-cache:{items}:index',
          'welcome',
          'demo-cache:{items}:item:welcome',
        ),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('uses the Redis client for readiness checks', async () => {
      await indexedService.ping(1_000);

      expect(redisClient.ping).toHaveBeenCalledTimes(1);
    });

    it('aborts a connected transport when a cache command receives no reply', async () => {
      jest.useFakeTimers();
      const disconnect = jest
        .spyOn(redisStore, 'disconnect')
        .mockResolvedValue(undefined);
      jest
        .mocked(indexedCacheManager.get)
        .mockImplementationOnce(() => new Promise(() => undefined));

      const rejection = expect(
        indexedService.get('stalled-command'),
      ).rejects.toThrow('availability budget');
      await jest.advanceTimersByTimeAsync(3_000);

      await rejection;
      expect(disconnect).toHaveBeenCalledWith(true);
      jest.useRealTimers();
    });
  });
});

function getRedisStorageKey(
  cacheStore: Keyv<string>,
  redisStore: KeyvRedis<unknown>,
  key: string,
): string {
  return redisStore.createKeyPrefix(
    cacheStore._getKeyPrefix(key),
    redisStore.namespace,
  );
}
