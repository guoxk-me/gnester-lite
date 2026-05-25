import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
});
