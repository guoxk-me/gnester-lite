import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoSortOrder } from './dto/list-demo-query.dto';
import {
  DEMO_DATABASE_MAX_UNPAGED_RESULTS,
  DemoDatabaseService,
} from './demo-database.service';
import { Demo } from './entities/demo.entity';

describe('DemoDatabaseService', () => {
  type QueryBuilderMock = {
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    getMany: jest.Mock;
  };

  type RepositoryMock = {
    save: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  type QueryRunnerMock = {
    isTransactionActive: boolean;
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
    limit: jest.fn(),
    getMany: jest.fn(),
  };
  const repository: RepositoryMock = {
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const queryRunner: QueryRunnerMock = {
    isTransactionActive: false,
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

  beforeEach(async () => {
    jest.clearAllMocks();
    // AI modified: isolate transaction-state mutations across cleanup failure tests.
    queryRunner.isTransactionActive = false;
    repository.save.mockImplementation((value: CreateDemoDto) =>
      Promise.resolve({ id: 1, ...value }),
    );
    repository.find.mockResolvedValue([]);
    repository.findAndCount.mockResolvedValue([[], 0]);
    repository.findOneBy.mockResolvedValue(null);
    repository.findBy.mockResolvedValue([]);
    repository.update.mockResolvedValue({ affected: 1 });
    repository.delete.mockResolvedValue({ affected: 1 });
    repository.count.mockResolvedValue(0);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    queryBuilder.limit.mockReturnThis();
    queryBuilder.getMany.mockResolvedValue([]);
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    queryRunner.manager.save.mockResolvedValue([]);
    queryRunner.connect.mockResolvedValue(undefined);
    queryRunner.startTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = true;
      return Promise.resolve();
    });
    queryRunner.commitTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = false;
      return Promise.resolve();
    });
    queryRunner.rollbackTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = false;
      return Promise.resolve();
    });
    queryRunner.release.mockResolvedValue(undefined);

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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

  it('returns name-only DTO examples unchanged', () => {
    expect(service.createNameOnly({ name: 'first demo' })).toEqual({
      name: 'first demo',
    });
  });

  it('returns database records through the repository', async () => {
    repository.find.mockResolvedValue([{ id: 1, name: 'demo' }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1, name: 'demo' }]);
    expect(repository.find).toHaveBeenCalledWith({
      order: { id: DemoSortOrder.Asc },
      take: DEMO_DATABASE_MAX_UNPAGED_RESULTS,
    });
  });

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

  it('returns one demo record by id', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    repository.findOneBy.mockResolvedValueOnce(demo);

    await expect(service.findOne(1)).resolves.toEqual(demo);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('returns many demo records by ids', async () => {
    const demos = [{ id: 1, name: 'demo', description: 'database example' }];
    repository.findBy.mockResolvedValueOnce(demos);

    await expect(service.findManyByIds([1, 2, 3])).resolves.toEqual(demos);
    expect(repository.findBy).toHaveBeenCalledWith({ id: In([1, 2, 3]) });
  });

  it('searches demo records with a query builder', async () => {
    const demos = [{ id: 1, name: 'demo', description: 'database example' }];
    queryBuilder.getMany.mockResolvedValueOnce(demos);

    await expect(service.searchByName('demo')).resolves.toEqual(demos);
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('demo');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      "demo.name LIKE :keyword ESCAPE '!'",
      {
        keyword: '%demo%',
      },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('demo.id', 'ASC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(
      DEMO_DATABASE_MAX_UNPAGED_RESULTS,
    );
  });

  it.each([
    ['percent wildcard', '50%', '%50!%%'],
    ['single-character wildcard', 'demo_name', '%demo!_name%'],
    ['escape character', 'important!', '%important!!%'],
    ['all special characters', '!%_', '%!!!%!_%'],
  ])(
    'treats the %s as literal text in name searches',
    async (_scenario, keyword, expectedPattern) => {
      await service.searchByName(keyword);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        "demo.name LIKE :keyword ESCAPE '!'",
        {
          keyword: expectedPattern,
        },
      );
    },
  );

  it('returns the demo row count', async () => {
    repository.count.mockResolvedValueOnce(3);

    await expect(service.count()).resolves.toBe(3);
    expect(repository.count).toHaveBeenCalled();
  });

  it('returns a count summary response', async () => {
    repository.count.mockResolvedValueOnce(3);

    await expect(service.countSummary()).resolves.toEqual({ count: 3 });
  });

  it('throws NotFoundException when finding a missing demo record', async () => {
    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates a demo record through the repository', async () => {
    const updatedDemo = {
      id: 1,
      name: 'concurrently renamed demo',
      description: 'updated demo',
    };
    repository.findOneBy.mockResolvedValueOnce(updatedDemo);

    await expect(
      service.update(1, { description: 'updated demo' }),
    ).resolves.toEqual(updatedDemo);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      {
        description: 'updated demo',
      },
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('checks existence without issuing an invalid empty update', async () => {
    const demo = { id: 1, name: 'demo', description: 'database example' };
    repository.findOneBy.mockResolvedValueOnce(demo);

    await expect(service.update(1, {})).resolves.toEqual(demo);

    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('does not recreate a record deleted before the post-update read', async () => {
    repository.findOneBy.mockResolvedValueOnce(null);

    await expect(
      service.update(404, { description: 'updated demo' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 404 },
      { description: 'updated demo' },
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

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

  it('returns committed records when releasing the query runner fails afterward', async () => {
    const demos = [
      {
        id: 1,
        name: 'first',
        description: 'first demo',
      },
    ];
    const releaseError = new Error('release failed');
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    queryRunner.manager.save.mockResolvedValueOnce(demos);
    queryRunner.release.mockRejectedValueOnce(releaseError);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).resolves.toEqual(demos);

    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to release demo query runner',
      expect.stringContaining('release failed'),
    );
  });

  it('rolls back when transactional creation fails', async () => {
    const error = new Error('database failed');
    queryRunner.manager.save.mockRejectedValueOnce(error);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toThrow(error);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('preserves a commit failure when rollback and release also fail', async () => {
    const commitError = new Error('commit failed');
    const rollbackError = new Error('rollback failed');
    const releaseError = new Error('release failed');
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    queryRunner.commitTransaction.mockRejectedValueOnce(commitError);
    queryRunner.rollbackTransaction.mockRejectedValueOnce(rollbackError);
    queryRunner.release.mockRejectedValueOnce(releaseError);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toBe(commitError);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to roll back demo transaction',
      expect.stringContaining('rollback failed'),
    );
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to release demo query runner',
      expect.stringContaining('release failed'),
    );
  });

  // AI modified: verifies transaction startup failures cannot leak a QueryRunner.
  it('releases the query runner when transaction startup fails', async () => {
    const error = new Error('transaction startup failed');
    queryRunner.startTransaction.mockRejectedValueOnce(error);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toThrow(error);

    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('preserves a startup failure when releasing the query runner also fails', async () => {
    const startupError = new Error('transaction startup failed');
    const releaseError = new Error('release failed');
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    queryRunner.startTransaction.mockRejectedValueOnce(startupError);
    queryRunner.release.mockRejectedValueOnce(releaseError);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toBe(startupError);

    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to release demo query runner',
      expect.stringContaining('release failed'),
    );
  });

  it('preserves a save failure while rollback and release cleanup both fail', async () => {
    const saveError = new Error('save failed');
    const rollbackError = new Error('rollback failed');
    const releaseError = new Error('release failed');
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    queryRunner.manager.save.mockRejectedValueOnce(saveError);
    queryRunner.rollbackTransaction.mockRejectedValueOnce(rollbackError);
    queryRunner.release.mockRejectedValueOnce(releaseError);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toBe(saveError);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to roll back demo transaction',
      expect.stringContaining('rollback failed'),
    );
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to release demo query runner',
      expect.stringContaining('release failed'),
    );
  });

  it('still releases and preserves the save failure when cleanup logging fails', async () => {
    const saveError = new Error('save failed');
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      throw new Error('logger failed');
    });
    queryRunner.manager.save.mockRejectedValueOnce(saveError);
    queryRunner.rollbackTransaction.mockRejectedValueOnce(
      new Error('rollback failed'),
    );
    queryRunner.release.mockRejectedValueOnce(new Error('release failed'));

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toBe(saveError);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when deleting a missing demo record', async () => {
    repository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
