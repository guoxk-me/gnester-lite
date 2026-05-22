import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

describe('DemoDatabaseService', () => {
  let service: DemoDatabaseService;
  const queryBuilder = {
    where: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn(),
  };
  const repository = {
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
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    manager: {
      save: jest.fn(),
    },
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };
  const dataSource = {
    createQueryRunner: jest.fn(),
  };

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

  it('returns database records through the repository', async () => {
    repository.find.mockResolvedValue([{ id: 1, name: 'demo' }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1, name: 'demo' }]);
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
      order: { id: 'ASC' },
      skip: 5,
      take: 5,
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
    expect(queryBuilder.where).toHaveBeenCalledWith('demo.name LIKE :keyword', {
      keyword: '%demo%',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('demo.id', 'ASC');
  });

  it('returns the demo row count', async () => {
    repository.count.mockResolvedValueOnce(3);

    await expect(service.count()).resolves.toBe(3);
    expect(repository.count).toHaveBeenCalled();
  });

  it('throws NotFoundException when finding a missing demo record', async () => {
    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

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

  it('rolls back when transactional creation fails', async () => {
    const error = new Error('database failed');
    queryRunner.manager.save.mockRejectedValueOnce(error);

    await expect(
      service.createMany([{ name: 'first', description: 'first demo' }]),
    ).rejects.toThrow(error);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('throws NotFoundException when deleting a missing demo record', async () => {
    repository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
