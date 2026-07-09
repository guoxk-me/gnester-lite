// CN: 测试文件，验证 demo-cache 的行为契约；EN: Test file verifies behavior contracts for demo-cache.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoCacheController } from './demo-cache.controller';
import { DemoCacheService } from './demo-cache.service';

// CN: 测试分组：DemoCacheController；EN: Test group: DemoCacheController.
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

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：delegates cache item creation to the service；EN: Test case: delegates cache item creation to the service.
  it('delegates cache item creation to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.create.mockResolvedValueOnce(cacheItem);

    await expect(controller.create(cacheItem)).resolves.toEqual(cacheItem);
    expect(service.create).toHaveBeenCalledWith(cacheItem);
  });

  // CN: 测试用例：delegates cache item listing to the service；EN: Test case: delegates cache item listing to the service.
  it('delegates cache item listing to the service', async () => {
    service.findAll.mockResolvedValueOnce([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates single cache item reads to the service；EN: Test case: delegates single cache item reads to the service.
  it('delegates single cache item reads to the service', async () => {
    const cacheItem = { key: 'welcome', value: 'hello cache' };
    service.findOne.mockResolvedValueOnce(cacheItem);

    await expect(controller.findOne('welcome')).resolves.toEqual(cacheItem);
    expect(service.findOne).toHaveBeenCalledWith('welcome');
  });

  // CN: 测试用例：delegates cache item updates to the service；EN: Test case: delegates cache item updates to the service.
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

  // CN: 测试用例：delegates cache item deletion to the service；EN: Test case: delegates cache item deletion to the service.
  it('delegates cache item deletion to the service', async () => {
    service.remove.mockResolvedValueOnce(undefined);

    await expect(controller.remove('welcome')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('welcome');
  });
});
