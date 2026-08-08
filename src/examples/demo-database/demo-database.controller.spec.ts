import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  demoCreateManyPipe,
  DemoDatabaseController,
} from './demo-database.controller';
import { DemoDatabaseService } from './demo-database.service';
import { DEMO_DATABASE_MAX_BATCH_SIZE } from './dto/bulk-create-demo.dto';
import { CreateDemoDto } from './dto/create-demo.dto';
import {
  DEMO_DATABASE_MAX_ID,
  DemoIdParamsDto,
} from './dto/demo-id-params.dto';
import {
  CreateDemoWithAuditDto,
  UpdateDemoDescriptionDto,
} from './dto/demo-mapped-types.dto';
import {
  DEMO_DATABASE_MAX_PAGE,
  DemoSortOrder,
  ListDemoQueryDto,
} from './dto/list-demo-query.dto';
import { SearchDemoQueryDto } from './dto/search-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';

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

  it.each([
    ['empty name', { name: '', description: 'database demo' }],
    ['whitespace-only name', { name: '   ', description: 'database demo' }],
    ['empty description', { name: 'demo', description: '' }],
    ['whitespace-only description', { name: 'demo', description: '   ' }],
  ])('rejects a create payload with an %s', async (_scenario, payload) => {
    const dto = plainToInstance(CreateDemoDto, payload);

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects a whitespace-only audit request id', async () => {
    const dto = plainToInstance(CreateDemoWithAuditDto, {
      name: 'demo',
      description: 'database demo',
      requestId: '   ',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('preserves text validation through mapped update DTOs', async () => {
    const descriptionUpdate = plainToInstance(UpdateDemoDescriptionDto, {
      description: '   ',
    });
    const partialUpdate = plainToInstance(UpdateDemoDto, { name: '   ' });

    await expect(validate(descriptionUpdate)).resolves.not.toHaveLength(0);
    await expect(validate(partialUpdate)).resolves.not.toHaveLength(0);
    await expect(validate(new UpdateDemoDto())).resolves.toHaveLength(0);
  });

  it.each([
    ['empty', []],
    [
      'oversized',
      Array.from({ length: DEMO_DATABASE_MAX_BATCH_SIZE + 1 }, (_, index) => ({
        name: `demo-${index}`,
        description: 'database demo',
      })),
    ],
  ])('rejects an %s raw bulk-create batch', async (_scenario, batch) => {
    await expect(controller.createMany(batch)).rejects.toThrow(
      BadRequestException,
    );
    expect(service.createMany).not.toHaveBeenCalled();
  });

  it('rejects extra fields inside the raw bulk-create array', async () => {
    await expect(
      demoCreateManyPipe.transform(
        [
          {
            name: 'first',
            description: 'first demo',
            unexpected: 'must be rejected',
          },
        ],
        {
          type: 'body',
          metatype: Array,
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

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

  it('delegates name-only DTO examples to the service', () => {
    service.createNameOnly.mockReturnValueOnce({ name: 'first' });

    expect(controller.createNameOnly({ name: 'first' })).toEqual({
      name: 'first',
    });
    expect(service.createNameOnly).toHaveBeenCalledWith({ name: 'first' });
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

  it('rejects page offsets beyond the supported pagination window', async () => {
    const query = plainToInstance(ListDemoQueryDto, {
      page: DEMO_DATABASE_MAX_PAGE + 1,
    });

    await expect(validate(query)).resolves.not.toHaveLength(0);
  });

  it('delegates id list reads to the service', async () => {
    service.findManyByIds.mockResolvedValueOnce([]);

    await expect(controller.findManyByIds([1, 2])).resolves.toEqual([]);
    expect(service.findManyByIds).toHaveBeenCalledWith([1, 2]);
  });

  it.each([
    ['empty', []],
    ['zero', [0]],
    ['negative', [-1]],
    ['fractional', [1.5]],
    ['outside signed-INT domain', [DEMO_DATABASE_MAX_ID + 1]],
    ['unsafe integer', [Number.MAX_SAFE_INTEGER + 1]],
    [
      'oversized',
      Array.from(
        { length: DEMO_DATABASE_MAX_BATCH_SIZE + 1 },
        (_, index) => index + 1,
      ),
    ],
  ])('rejects an %s id list', async (_scenario, ids) => {
    await expect(controller.findManyByIds(ids)).rejects.toThrow(
      BadRequestException,
    );
    expect(service.findManyByIds).not.toHaveBeenCalled();
  });

  it('delegates name searches to the service', async () => {
    service.searchByName.mockResolvedValueOnce([]);

    await expect(controller.searchByName({ keyword: 'demo' })).resolves.toEqual(
      [],
    );
    expect(service.searchByName).toHaveBeenCalledWith('demo');
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['overlong', 'x'.repeat(21)],
  ])('rejects a %s search keyword', async (_scenario, keyword) => {
    const query = plainToInstance(SearchDemoQueryDto, { keyword });

    await expect(validate(query)).resolves.not.toHaveLength(0);
  });

  it('accepts a bounded non-blank search keyword', async () => {
    const query = plainToInstance(SearchDemoQueryDto, { keyword: 'demo' });

    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('delegates row counting to the service', async () => {
    service.countSummary.mockResolvedValueOnce({ count: 3 });

    await expect(controller.count()).resolves.toEqual({ count: 3 });
    expect(service.countSummary).toHaveBeenCalled();
  });

  it('returns explicitly parsed boolean flags', () => {
    expect(controller.getFlag(true)).toEqual({ enabled: true });
  });

  it('returns explicitly parsed UUID params', () => {
    const id = '3f2e1012-0f36-4d48-88f9-3db407e1942b';

    expect(controller.getUuid(id)).toEqual({ id });
  });

  it('delegates parsed id reads to the service', async () => {
    const demo = {
      id: 1,
      name: 'demo',
      description: 'database example',
      internalNote: 'must not cross the HTTP boundary',
    };
    service.findOne.mockResolvedValueOnce(demo);

    await expect(controller.findOne({ id: 1 })).resolves.toEqual({
      id: 1,
      name: 'demo',
      description: 'database example',
    });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it.each([
    ['zero', '0'],
    ['negative', '-1'],
    ['outside signed-INT domain', String(DEMO_DATABASE_MAX_ID + 1)],
    ['unsafe integer', String(Number.MAX_SAFE_INTEGER + 1)],
  ])('rejects a %s database id path', async (_scenario, id) => {
    const params = plainToInstance(DemoIdParamsDto, { id });

    await expect(validate(params)).resolves.not.toHaveLength(0);
  });

  it('delegates description-only updates to the service', async () => {
    const demo = { id: 1, name: 'demo', description: 'updated demo' };
    service.update.mockResolvedValueOnce(demo);

    await expect(
      controller.updateDescription({ id: 1 }, { description: 'updated demo' }),
    ).resolves.toEqual(demo);
    expect(service.update).toHaveBeenCalledWith(1, {
      description: 'updated demo',
    });
  });
});
