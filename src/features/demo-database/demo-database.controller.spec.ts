// CN: 测试文件，验证 demo-database 的行为契约；EN: Test file verifies behavior contracts for demo-database.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoDatabaseController } from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';
import { DemoSortOrder } from './dto/list-demo-query.dto';

// CN: 测试分组：DemoDatabaseController；EN: Test group: DemoDatabaseController.
describe('DemoDatabaseController', () => {
  let controller: DemoDatabaseController;
  const service: jest.Mocked<
    Pick<
      DemoDatabaseService,
      | 'create'
      | 'createWithAudit'
      | 'createNameOnly'
      | 'createMany'
      | 'findAll'
      | 'findPage'
      | 'findManyByIds'
      | 'searchByName'
      | 'countSummary'
      | 'parseFlag'
      | 'parseUuid'
      | 'findOne'
      | 'update'
      | 'remove'
    >
  > = {
    create: jest.fn(),
    createWithAudit: jest.fn(),
    createNameOnly: jest.fn(),
    createMany: jest.fn(),
    findAll: jest.fn(),
    findPage: jest.fn(),
    findManyByIds: jest.fn(),
    searchByName: jest.fn(),
    countSummary: jest.fn(),
    parseFlag: jest.fn(),
    parseUuid: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：should be defined；EN: Test case: should be defined.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // CN: 测试用例：delegates bulk creation to the service；EN: Test case: delegates bulk creation to the service.
  it('delegates bulk creation to the service', async () => {
    const createDemoDtos = [{ name: 'first', description: 'first demo' }];
    service.createMany.mockResolvedValueOnce([]);

    await expect(controller.createMany(createDemoDtos)).resolves.toEqual([]);
    expect(service.createMany).toHaveBeenCalledWith(createDemoDtos);
  });

  // CN: 测试用例：delegates audited creation without persisting audit metadata；EN: Test case: delegates audited creation without persisting audit metadata.
  it('delegates audited creation without persisting audit metadata', async () => {
    service.createWithAudit.mockResolvedValueOnce({
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
    expect(service.createWithAudit).toHaveBeenCalledWith({
      name: 'first',
      description: 'first demo',
      requestId: 'req-001',
    });
  });

  // CN: 测试用例：delegates name-only DTO examples to the service；EN: Test case: delegates name-only DTO examples to the service.
  it('delegates name-only DTO examples to the service', () => {
    service.createNameOnly.mockReturnValueOnce({ name: 'first' });

    expect(controller.createNameOnly({ name: 'first' })).toEqual({
      name: 'first',
    });
    expect(service.createNameOnly).toHaveBeenCalledWith({ name: 'first' });
  });

  // CN: 测试用例：delegates wrapped bulk creation to the service；EN: Test case: delegates wrapped bulk creation to the service.
  it('delegates wrapped bulk creation to the service', async () => {
    const createDemoDtos = [{ name: 'first', description: 'first demo' }];
    service.createMany.mockResolvedValueOnce([]);

    await expect(
      controller.createManyWrapped({ items: createDemoDtos }),
    ).resolves.toEqual([]);
    expect(service.createMany).toHaveBeenCalledWith(createDemoDtos);
  });

  // CN: 测试用例：delegates paginated reads to the service；EN: Test case: delegates paginated reads to the service.
  it('delegates paginated reads to the service', async () => {
    service.findPage.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    await expect(
      controller.findPage({
        page: 2,
        limit: 10,
        order: DemoSortOrder.Desc,
      }),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
    });
    expect(service.findPage).toHaveBeenCalledWith(2, 10, DemoSortOrder.Desc);
  });

  // CN: 测试用例：delegates id list reads to the service；EN: Test case: delegates id list reads to the service.
  it('delegates id list reads to the service', async () => {
    service.findManyByIds.mockResolvedValueOnce([]);

    await expect(controller.findManyByIds([1, 2])).resolves.toEqual([]);
    expect(service.findManyByIds).toHaveBeenCalledWith([1, 2]);
  });

  // CN: 测试用例：delegates name searches to the service；EN: Test case: delegates name searches to the service.
  it('delegates name searches to the service', async () => {
    service.searchByName.mockResolvedValueOnce([]);

    await expect(controller.searchByName('demo')).resolves.toEqual([]);
    expect(service.searchByName).toHaveBeenCalledWith('demo');
  });

  // CN: 测试用例：delegates row counting to the service；EN: Test case: delegates row counting to the service.
  it('delegates row counting to the service', async () => {
    service.countSummary.mockResolvedValueOnce({ count: 3 });

    await expect(controller.count()).resolves.toEqual({ count: 3 });
    expect(service.countSummary).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates explicitly parsed boolean flags to the service；EN: Test case: delegates explicitly parsed boolean flags to the service.
  it('delegates explicitly parsed boolean flags to the service', () => {
    service.parseFlag.mockReturnValueOnce({ enabled: true });

    expect(controller.parseFlag(true)).toEqual({ enabled: true });
    expect(service.parseFlag).toHaveBeenCalledWith(true);
  });

  // CN: 测试用例：delegates explicitly parsed UUID params to the service；EN: Test case: delegates explicitly parsed UUID params to the service.
  it('delegates explicitly parsed UUID params to the service', () => {
    const id = '3f2e1012-0f36-4d48-88f9-3db407e1942b';
    service.parseUuid.mockReturnValueOnce({ id });

    expect(controller.parseUuid(id)).toEqual({ id });
    expect(service.parseUuid).toHaveBeenCalledWith(id);
  });

  // CN: 测试用例：delegates parsed id reads to the service；EN: Test case: delegates parsed id reads to the service.
  it('delegates parsed id reads to the service', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    service.findOne.mockResolvedValueOnce(demo);

    await expect(controller.findOne(1)).resolves.toEqual(demo);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  // CN: 测试用例：delegates description-only updates to the service；EN: Test case: delegates description-only updates to the service.
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
