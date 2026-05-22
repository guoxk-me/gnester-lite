import { Test, TestingModule } from '@nestjs/testing';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';

describe('DemoDatabaseController', () => {
  let controller: DemoDatabaseController;
  const service = {
    create: jest.fn(),
    createMany: jest.fn(),
    findAll: jest.fn(),
    findPage: jest.fn(),
    findManyByIds: jest.fn(),
    searchByName: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoDatabaseController],
      providers: [
        {
          provide: DemoDatabaseService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoDatabaseController>(DemoDatabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates bulk creation to the service', async () => {
    const createDemoDtos = [{ name: 'first', description: 'first demo' }];
    service.createMany.mockResolvedValueOnce([]);

    await expect(controller.createMany(createDemoDtos)).resolves.toEqual([]);
    expect(service.createMany).toHaveBeenCalledWith(createDemoDtos);
  });

  it('delegates paginated reads to the service', async () => {
    service.findPage.mockResolvedValueOnce({ data: [], total: 0 });

    await expect(controller.findPage(2, 10)).resolves.toEqual({
      data: [],
      total: 0,
    });
    expect(service.findPage).toHaveBeenCalledWith(2, 10);
  });

  it('delegates id list reads to the service', async () => {
    service.findManyByIds.mockResolvedValueOnce([]);

    await expect(controller.findManyByIds([1, 2])).resolves.toEqual([]);
    expect(service.findManyByIds).toHaveBeenCalledWith([1, 2]);
  });

  it('delegates name searches to the service', async () => {
    service.searchByName.mockResolvedValueOnce([]);

    await expect(controller.searchByName('demo')).resolves.toEqual([]);
    expect(service.searchByName).toHaveBeenCalledWith('demo');
  });

  it('delegates row counting to the service', async () => {
    service.count.mockResolvedValueOnce(3);

    await expect(controller.count()).resolves.toEqual({ count: 3 });
    expect(service.count).toHaveBeenCalled();
  });
});
