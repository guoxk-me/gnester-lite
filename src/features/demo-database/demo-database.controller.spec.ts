import { Test, TestingModule } from '@nestjs/testing';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';
import { DemoSortOrder } from './dto/list-demo-query.dto';

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

  it('delegates audited creation without persisting audit metadata', async () => {
    service.create.mockResolvedValueOnce({
      id: 1,
      name: 'first',
      description: 'first demo',
    });

    await expect(
      controller.createWithAudit({
        name: 'first',
        description: 'first demo',
        requestId: 'req-001',
      }),
    ).resolves.toEqual({
      id: 1,
      name: 'first',
      description: 'first demo',
    });
    expect(service.create).toHaveBeenCalledWith({
      name: 'first',
      description: 'first demo',
    });
  });

  it('returns the mapped name-only DTO payload', () => {
    expect(controller.createNameOnly({ name: 'first' })).toEqual({
      name: 'first',
    });
  });

  it('delegates wrapped bulk creation to the service', async () => {
    const createDemoDtos = [{ name: 'first', description: 'first demo' }];
    service.createMany.mockResolvedValueOnce([]);

    await expect(
      controller.createManyWrapped({ items: createDemoDtos }),
    ).resolves.toEqual([]);
    expect(service.createMany).toHaveBeenCalledWith(createDemoDtos);
  });

  it('delegates paginated reads to the service', async () => {
    service.findPage.mockResolvedValueOnce({ data: [], total: 0 });

    await expect(
      controller.findPage({
        page: 2,
        limit: 10,
        order: DemoSortOrder.Desc,
      }),
    ).resolves.toEqual({
      data: [],
      total: 0,
    });
    expect(service.findPage).toHaveBeenCalledWith(2, 10, DemoSortOrder.Desc);
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

  it('returns explicitly parsed boolean flags', () => {
    expect(controller.parseFlag(true)).toEqual({ enabled: true });
  });

  it('returns explicitly parsed UUID params', () => {
    const id = '3f2e1012-0f36-4d48-88f9-3db407e1942b';

    expect(controller.parseUuid(id)).toEqual({ id });
  });

  it('delegates param DTO reads to the service', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    service.findOne.mockResolvedValueOnce(demo);

    await expect(controller.findOne({ id: '1' })).resolves.toEqual(demo);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('delegates description-only updates to the service', async () => {
    const demo = { id: 1, name: 'demo', description: 'updated demo' };
    service.update.mockResolvedValueOnce(demo);

    await expect(
      controller.updateDescription(1, { description: 'updated demo' }),
    ).resolves.toEqual(demo);
    expect(service.update).toHaveBeenCalledWith(1, {
      description: 'updated demo',
    });
  });
});
