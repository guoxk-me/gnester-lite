// CN: 测试文件，验证 demo-cache 的行为契约；EN: Test file verifies behavior contracts for demo-cache.
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../common/cache/cache.service';
import { DemoCacheService } from './demo-cache.service';

// CN: 测试分组：DemoCacheService；EN: Test group: DemoCacheService.
describe('DemoCacheService', () => {
  const cacheService: jest.Mocked<Pick<CacheService, 'get' | 'set' | 'del'>> = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  let service: DemoCacheService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();
    cacheService.get.mockResolvedValue(undefined);

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

  // CN: 测试用例：creates a cache item and tracks its key without declaring a local ttl；EN: Test case: creates a cache item and tracks its key without declaring a local ttl.
  it('creates a cache item and tracks its key without declaring a local ttl', async () => {
    await expect(
      service.create({ key: 'welcome', value: 'hello cache' }),
    ).resolves.toEqual({
      key: 'welcome',
      value: 'hello cache',
    });

    expect(cacheService.set).toHaveBeenCalledWith(
      'demo-cache:item:welcome',
      'hello cache',
    );
    expect(cacheService.set).toHaveBeenCalledWith('demo-cache:index', [
      'welcome',
    ]);
  });

  // CN: 测试用例：lists tracked cache items and skips expired values；EN: Test case: lists tracked cache items and skips expired values.
  it('lists tracked cache items and skips expired values', async () => {
    cacheService.get
      .mockResolvedValueOnce(['first', 'expired'])
      .mockResolvedValueOnce('first value')
      .mockResolvedValueOnce(undefined);

    await expect(service.findAll()).resolves.toEqual([
      {
        key: 'first',
        value: 'first value',
      },
    ]);
  });

  // CN: 测试用例：returns one cache item by key；EN: Test case: returns one cache item by key.
  it('returns one cache item by key', async () => {
    cacheService.get.mockResolvedValueOnce('cached value');

    await expect(service.findOne('welcome')).resolves.toEqual({
      key: 'welcome',
      value: 'cached value',
    });
    expect(cacheService.get).toHaveBeenCalledWith('demo-cache:item:welcome');
  });

  // CN: 测试用例：throws NotFoundException when a cache item is missing；EN: Test case: throws NotFoundException when a cache item is missing.
  it('throws NotFoundException when a cache item is missing', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // CN: 测试用例：updates an existing cache item without declaring a local ttl；EN: Test case: updates an existing cache item without declaring a local ttl.
  it('updates an existing cache item without declaring a local ttl', async () => {
    cacheService.get.mockResolvedValueOnce('old value');

    await expect(
      service.update('welcome', { value: 'new value' }),
    ).resolves.toEqual({
      key: 'welcome',
      value: 'new value',
    });

    expect(cacheService.set).toHaveBeenCalledWith(
      'demo-cache:item:welcome',
      'new value',
    );
  });

  // CN: 测试用例：removes a cache item and updates the tracked key index；EN: Test case: removes a cache item and updates the tracked key index.
  it('removes a cache item and updates the tracked key index', async () => {
    cacheService.get
      .mockResolvedValueOnce('cached value')
      .mockResolvedValueOnce(['welcome', 'other']);

    await service.remove('welcome');

    expect(cacheService.del).toHaveBeenCalledWith('demo-cache:item:welcome');
    expect(cacheService.set).toHaveBeenCalledWith('demo-cache:index', [
      'other',
    ]);
  });
});
