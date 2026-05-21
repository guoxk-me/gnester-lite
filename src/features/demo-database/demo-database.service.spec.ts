import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

describe('DemoDatabaseService', () => {
  let service: DemoDatabaseService;
  let loggerErrorSpy: jest.SpyInstance;
  const repository = {
    save: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
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
  const cacheManager = {
    set: jest.fn(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    repository.save.mockImplementation((value: CreateDemoDto) =>
      Promise.resolve({ id: 1, ...value }),
    );
    repository.find.mockResolvedValue([]);
    repository.findBy.mockResolvedValue([]);
    repository.findOneBy.mockResolvedValue(null);
    repository.delete.mockResolvedValue({ affected: 1 });

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
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<DemoDatabaseService>(DemoDatabaseService);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
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

  it('rolls back and rethrows when a transaction fails', async () => {
    const error = new Error('insert failed');
    queryRunner.manager.save.mockRejectedValueOnce(error);

    await expect(
      service.createMany([
        { name: 'first', description: 'first demo' },
        { name: 'second', description: 'second demo' },
      ]),
    ).rejects.toThrow('insert failed');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('throws NotFoundException when deleting a missing demo record', async () => {
    repository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
