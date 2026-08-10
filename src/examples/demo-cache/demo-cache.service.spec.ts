import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../platform/infrastructure/cache/cache.service';
import { DEMO_CACHE_MAX_ENTRIES, DemoCacheService } from './demo-cache.service';

describe('DemoCacheService', () => {
  const cacheService: jest.Mocked<
    Pick<
      CacheService,
      | 'deleteIndexedValue'
      | 'get'
      | 'getIndexMembers'
      | 'removeIndexMemberIfItemMissing'
      | 'setIndexedValue'
    >
  > = {
    deleteIndexedValue: jest.fn(),
    get: jest.fn(),
    getIndexMembers: jest.fn(),
    removeIndexMemberIfItemMissing: jest.fn(),
    setIndexedValue: jest.fn(),
  };
  let service: DemoCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    cacheService.get.mockResolvedValue(undefined);
    cacheService.getIndexMembers.mockResolvedValue([]);
    cacheService.setIndexedValue.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoCacheService,
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<DemoCacheService>(DemoCacheService);
  });

  it('creates a cache item and tracks its key without declaring a local ttl', async () => {
    await expect(
      service.create({ key: 'welcome', value: 'hello cache' }),
    ).resolves.toEqual({
      key: 'welcome',
      value: 'hello cache',
    });

    expect(cacheService.setIndexedValue).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      'welcome',
      'demo-cache:{items}:item:welcome',
      'hello cache',
      { maximumEntries: DEMO_CACHE_MAX_ENTRIES },
    );
  });

  it('lists tracked cache items and skips expired values', async () => {
    cacheService.getIndexMembers.mockResolvedValueOnce(['first', 'expired']);
    cacheService.get.mockImplementation((key) =>
      Promise.resolve(key.endsWith(':first') ? 'first value' : undefined),
    );

    await expect(service.findAll()).resolves.toEqual([
      {
        key: 'first',
        value: 'first value',
      },
    ]);
    expect(cacheService.removeIndexMemberIfItemMissing).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      'expired',
      'demo-cache:{items}:item:expired',
    );
    expect(cacheService.getIndexMembers).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      DEMO_CACHE_MAX_ENTRIES,
    );
  });

  it('preserves index membership when a missing key is recreated during listing', async () => {
    let continueCleanup!: () => void;
    let markCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>((resolve) => {
      markCleanupStarted = resolve;
    });
    const cleanupCanContinue = new Promise<void>((resolve) => {
      continueCleanup = resolve;
    });
    const cachedItems = new Map<string, string>();
    const indexedKeys = new Set(['welcome']);

    cacheService.getIndexMembers.mockResolvedValueOnce([...indexedKeys]);
    cacheService.get.mockImplementation((key) =>
      Promise.resolve(cachedItems.get(key)),
    );
    cacheService.setIndexedValue.mockImplementation(
      (_indexKey, indexMember, itemKey, value) => {
        cachedItems.set(itemKey, value);
        indexedKeys.add(indexMember);

        return Promise.resolve(true);
      },
    );
    cacheService.removeIndexMemberIfItemMissing.mockImplementation(
      async (_indexKey, indexMember, itemKey) => {
        markCleanupStarted();
        await cleanupCanContinue;

        if (!cachedItems.has(itemKey)) {
          indexedKeys.delete(indexMember);
        }
      },
    );

    const listing = service.findAll();
    await cleanupStarted;
    await service.create({ key: 'welcome', value: 'recreated' });
    continueCleanup();

    await expect(listing).resolves.toEqual([]);
    expect(indexedKeys).toContain('welcome');
    await expect(service.findOne('welcome')).resolves.toEqual({
      key: 'welcome',
      value: 'recreated',
    });
  });

  it('cleans expired members and retries capacity admission once', async () => {
    cacheService.setIndexedValue
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    cacheService.getIndexMembers.mockResolvedValueOnce(['expired']);

    await expect(
      service.create({ key: 'new-entry', value: 'stored after cleanup' }),
    ).resolves.toEqual({
      key: 'new-entry',
      value: 'stored after cleanup',
    });

    expect(cacheService.removeIndexMemberIfItemMissing).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      'expired',
      'demo-cache:{items}:item:expired',
    );
    expect(cacheService.setIndexedValue).toHaveBeenCalledTimes(2);
  });

  it('rejects a create without partial publication when capacity remains full', async () => {
    cacheService.setIndexedValue.mockResolvedValue(false);

    await expect(
      service.create({ key: 'one-too-many', value: 'must not publish' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(cacheService.setIndexedValue).toHaveBeenCalledTimes(2);
  });

  it('returns one cache item by key', async () => {
    cacheService.get.mockResolvedValueOnce('cached value');

    await expect(service.findOne('welcome')).resolves.toEqual({
      key: 'welcome',
      value: 'cached value',
    });
    expect(cacheService.get).toHaveBeenCalledWith(
      'demo-cache:{items}:item:welcome',
    );
  });

  it('throws NotFoundException when a cache item is missing', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an existing cache item without declaring a local ttl', async () => {
    cacheService.get.mockResolvedValueOnce('old value');

    await expect(
      service.update('welcome', { value: 'new value' }),
    ).resolves.toEqual({
      key: 'welcome',
      value: 'new value',
    });

    expect(cacheService.setIndexedValue).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      'welcome',
      'demo-cache:{items}:item:welcome',
      'new value',
      { maximumEntries: DEMO_CACHE_MAX_ENTRIES },
    );
  });

  it('rejects an update that loses its existing membership at full capacity', async () => {
    cacheService.get.mockResolvedValueOnce('old value');
    cacheService.setIndexedValue.mockResolvedValueOnce(false);

    await expect(
      service.update('welcome', { value: 'new value' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes a cache item and updates the tracked key index', async () => {
    cacheService.get.mockResolvedValueOnce('cached value');

    await service.remove('welcome');

    expect(cacheService.deleteIndexedValue).toHaveBeenCalledWith(
      'demo-cache:{items}:index',
      'welcome',
      'demo-cache:{items}:item:welcome',
    );
  });
});
