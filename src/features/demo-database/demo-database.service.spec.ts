// CN: 测试文件，验证 demo-database 的行为契约；EN: Test file verifies behavior contracts for demo-database.
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoSortOrder } from './dto/list-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

// CN: 测试分组：DemoDatabaseService；EN: Test group: DemoDatabaseService.
describe('DemoDatabaseService', () => {
  type QueryBuilderMock = {
    where: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  type RepositoryMock = {
    save: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    merge: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  type QueryRunnerMock = {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    manager: {
      save: jest.Mock;
    };
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };

  type DataSourceMock = {
    createQueryRunner: jest.Mock;
  };

  let service: DemoDatabaseService;
  const queryBuilder: QueryBuilderMock = {
    where: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn(),
  };
  const repository: RepositoryMock = {
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const queryRunner: QueryRunnerMock = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    manager: {
      save: jest.fn(),
    },
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };
  const dataSource: DataSourceMock = {
    createQueryRunner: jest.fn(),
  };

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();
    repository.save.mockImplementation((value: CreateDemoDto) =>
      Promise.resolve({ id: 1, ...value }),
    );
    repository.find.mockResolvedValue([]);
    repository.findAndCount.mockResolvedValue([[], 0]);
    repository.findOneBy.mockResolvedValue(null);
    repository.findBy.mockResolvedValue([]);
    repository.merge.mockImplementation(
      (demo: Demo, updateDemoDto: UpdateDemoDto) => ({
        ...demo,
        ...updateDemoDto,
      }),
    );
    repository.delete.mockResolvedValue({ affected: 1 });
    repository.count.mockResolvedValue(0);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    queryBuilder.getMany.mockResolvedValue([]);
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    queryRunner.manager.save.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoDatabaseService,
        {
          provide: getRepositoryToken(Demo),
          useValue: repository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<DemoDatabaseService>(DemoDatabaseService);
  });

  // CN: 测试用例：should be defined；EN: Test case: should be defined.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // CN: 测试用例：creates a demo record through the repository；EN: Test case: creates a demo record through the repository.
  it('creates a demo record through the repository', async () => {
    const result = await service.create({
      name: 'first demo',
      description: 'database example',
    });

    expect(repository.save).toHaveBeenCalledWith({
      name: 'first demo',
      description: 'database example',
    });
    expect(result).toEqual({
      id: 1,
      name: 'first demo',
      description: 'database example',
    });
  });

  // CN: 测试用例：creates audited demo records without persisting audit metadata；EN: Test case: creates audited demo records without persisting audit metadata.
  it('creates audited demo records without persisting audit metadata', async () => {
    const result = await service.createWithAudit({
      name: 'first demo',
      description: 'database example',
      requestId: 'req-001',
    });

    expect(repository.save).toHaveBeenCalledWith({
      name: 'first demo',
      description: 'database example',
    });
    expect(result).toEqual({
      id: 1,
      name: 'first demo',
      description: 'database example',
    });
  });

  // CN: 测试用例：returns name-only DTO examples unchanged；EN: Test case: returns name-only DTO examples unchanged.
  it('returns name-only DTO examples unchanged', () => {
    expect(service.createNameOnly({ name: 'first demo' })).toEqual({
      name: 'first demo',
    });
  });

  // CN: 测试用例：returns database records through the repository；EN: Test case: returns database records through the repository.
  it('returns database records through the repository', async () => {
    repository.find.mockResolvedValue([{ id: 1, name: 'demo' }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1, name: 'demo' }]);
  });

  // CN: 测试用例：returns paginated demo records with total count；EN: Test case: returns paginated demo records with total count.
  it('returns paginated demo records with total count', async () => {
    const demos = [{ id: 1, name: 'demo', description: 'database example' }];
    repository.findAndCount.mockResolvedValueOnce([demos, 12]);

    await expect(service.findPage(2, 5)).resolves.toEqual({
      data: demos,
      total: 12,
      page: 2,
      limit: 5,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      order: { id: DemoSortOrder.Asc },
      skip: 5,
      take: 5,
    });
  });

  // CN: 测试用例：returns paginated demo records with descending order；EN: Test case: returns paginated demo records with descending order.
  it('returns paginated demo records with descending order', async () => {
    await expect(service.findPage(1, 10, DemoSortOrder.Desc)).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      order: { id: DemoSortOrder.Desc },
      skip: 0,
      take: 10,
    });
  });

  // CN: 测试用例：returns one demo record by id；EN: Test case: returns one demo record by id.
  it('returns one demo record by id', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    repository.findOneBy.mockResolvedValueOnce(demo);

    await expect(service.findOne(1)).resolves.toEqual(demo);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  // CN: 测试用例：returns many demo records by ids；EN: Test case: returns many demo records by ids.
  it('returns many demo records by ids', async () => {
    const demos = [{ id: 1, name: 'demo', description: 'database example' }];
    repository.findBy.mockResolvedValueOnce(demos);

    await expect(service.findManyByIds([1, 2, 3])).resolves.toEqual(demos);
    expect(repository.findBy).toHaveBeenCalledWith({ id: In([1, 2, 3]) });
  });

  // CN: 测试用例：searches demo records with a query builder；EN: Test case: searches demo records with a query builder.
  it('searches demo records with a query builder', async () => {
    const demos = [{ id: 1, name: 'demo', description: 'database example' }];
    queryBuilder.getMany.mockResolvedValueOnce(demos);

    await expect(service.searchByName('demo')).resolves.toEqual(demos);
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('demo');
    expect(queryBuilder.where).toHaveBeenCalledWith('demo.name LIKE :keyword', {
      keyword: '%demo%',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('demo.id', 'ASC');
  });

  // CN: 测试用例：returns the demo row count；EN: Test case: returns the demo row count.
  it('returns the demo row count', async () => {
    repository.count.mockResolvedValueOnce(3);

    await expect(service.count()).resolves.toBe(3);
    expect(repository.count).toHaveBeenCalled();
  });

  // CN: 测试用例：returns a count summary response；EN: Test case: returns a count summary response.
  it('returns a count summary response', async () => {
    repository.count.mockResolvedValueOnce(3);

    await expect(service.countSummary()).resolves.toEqual({ count: 3 });
  });

  // CN: 测试用例：returns explicitly parsed boolean flag responses；EN: Test case: returns explicitly parsed boolean flag responses.
  it('returns explicitly parsed boolean flag responses', () => {
    expect(service.parseFlag(true)).toEqual({ enabled: true });
  });

  // CN: 测试用例：returns explicitly parsed UUID responses；EN: Test case: returns explicitly parsed UUID responses.
  it('returns explicitly parsed UUID responses', () => {
    const id = '3f2e1012-0f36-4d48-88f9-3db407e1942b';

    expect(service.parseUuid(id)).toEqual({ id });
  });

  // CN: 测试用例：throws NotFoundException when finding a missing demo record；EN: Test case: throws NotFoundException when finding a missing demo record.
  it('throws NotFoundException when finding a missing demo record', async () => {
    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // CN: 测试用例：updates a demo record through the repository；EN: Test case: updates a demo record through the repository.
  it('updates a demo record through the repository', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    const updatedDemo = { ...demo, description: 'updated demo' };
    repository.findOneBy.mockResolvedValueOnce(demo);
    repository.save.mockResolvedValueOnce(updatedDemo);

    await expect(
      service.update(1, { description: 'updated demo' }),
    ).resolves.toEqual(updatedDemo);
    expect(repository.merge).toHaveBeenCalledWith(demo, {
      description: 'updated demo',
    });
    expect(repository.save).toHaveBeenCalledWith(updatedDemo);
  });

  // CN: 测试用例：creates many demo records in a transaction；EN: Test case: creates many demo records in a transaction.
  it('creates many demo records in a transaction', async () => {
    const createDemoDtos = [
      { name: 'first', description: 'first demo' },
      { name: 'second', description: 'second demo' },
    ];
    const demos = createDemoDtos.map((demo, index) => ({
      id: index + 1,
      ...demo,
    }));
    queryRunner.manager.save.mockResolvedValueOnce(demos);

    await expect(service.createMany(createDemoDtos)).resolves.toEqual(demos);
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalledWith(Demo, createDemoDtos);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  // CN: 测试用例：rolls back when transactional creation fails；EN: Test case: rolls back when transactional creation fails.
  it('rolls back when transactional creation fails', async () => {
    const error = new Error('database failed');
    queryRunner.manager.save.mockRejectedValueOnce(error);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toThrow(error);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  // CN: 测试用例：throws NotFoundException when deleting a missing demo record；EN: Test case: throws NotFoundException when deleting a missing demo record.
  it('throws NotFoundException when deleting a missing demo record', async () => {
    repository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
