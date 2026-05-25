import { Test, TestingModule } from '@nestjs/testing';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

describe('DemoCacheController', () => {
  const service: jest.Mocked<
    Pick<
      DemoCacheService,
      'create' | 'findAll' | 'findOne' | 'update' | 'remove'
    >
  > = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: DemoCacheController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoCacheController],
      providers: [
        {
          provide: DemoCacheService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoCacheController>(DemoCacheController);
  });

  it('delegates cache item creation to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.create.mockResolvedValueOnce(cacheItem);

    await expect(controller.create(cacheItem)).resolves.toEqual(cacheItem);
    expect(service.create).toHaveBeenCalledWith(cacheItem);
  });

  it('delegates cache item listing to the service', async () => {
    service.findAll.mockResolvedValueOnce([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('delegates single cache item reads to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.findOne.mockResolvedValueOnce(cacheItem);

    await expect(controller.findOne('welcome')).resolves.toEqual(cacheItem);
    expect(service.findOne).toHaveBeenCalledWith('welcome');
  });

  it('delegates cache item updates to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'updated cache' };
    service.update.mockResolvedValueOnce(cacheItem);

    await expect(
      controller.update('welcome', { value: 'updated cache' }),
    ).resolves.toEqual(cacheItem);
    expect(service.update).toHaveBeenCalledWith('welcome', {
      value: 'updated cache',
    });
  });

  it('delegates cache item deletion to the service', async () => {
    service.remove.mockResolvedValueOnce(undefined);

    await expect(controller.remove('welcome')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('welcome');
  });
});
