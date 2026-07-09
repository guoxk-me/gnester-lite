// CN: 服务，承载 demo-database 的业务逻辑；EN: Service holds business logic for demo-database.
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoCountDto } from './dto/demo-count.dto';
import { DemoFlagDto } from './dto/demo-flag.dto';
import {
  CreateDemoWithAuditDto,
  DemoNameOnlyDto,
} from './dto/demo-mapped-types.dto';
import { DemoPageDto } from './dto/demo-page.dto';
import { DemoUuidDto } from './dto/demo-uuid.dto';
import { DemoSortOrder } from './dto/list-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { Demo } from './entities/demo.entity';

@Injectable()
export class DemoDatabaseService {
  // CN: 初始化 demo-database 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-database.
  constructor(
    @InjectRepository(Demo)
    private readonly demoRepository: Repository<Demo>,
    private readonly dataSource: DataSource,
  ) {}

  // CN: 执行 demo-database 的 create 业务逻辑；EN: Runs the create business logic for demo-database.
  async create(createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoRepository.save(createDemoDto);
  }

  // CN: 执行 demo-database 的 create with audit 业务逻辑；EN: Runs the create with audit business logic for demo-database.
  async createWithAudit(createDemoDto: CreateDemoWithAuditDto): Promise<Demo> {
    return this.create({
      name: createDemoDto.name,
      description: createDemoDto.description,
    });
  }

  // CN: 执行 demo-database 的 create name only 业务逻辑；EN: Runs the create name only business logic for demo-database.
  createNameOnly(demoNameOnlyDto: DemoNameOnlyDto): DemoNameOnlyDto {
    return demoNameOnlyDto;
  }

  // CN: 执行 demo-database 的 create many 业务逻辑；EN: Runs the create many business logic for demo-database.
  async createMany(createDemoDtos: CreateDemoDto[]): Promise<Demo[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const demos = await queryRunner.manager.save(Demo, createDemoDtos);
      await queryRunner.commitTransaction();

      return demos;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // CN: 执行 demo-database 的 find all 业务逻辑；EN: Runs the find all business logic for demo-database.
  async findAll(): Promise<Demo[]> {
    return this.demoRepository.find();
  }

  // CN: 执行 demo-database 的 find page 业务逻辑；EN: Runs the find page business logic for demo-database.
  async findPage(
    page: number,
    limit: number,
    order: DemoSortOrder = DemoSortOrder.Asc,
  ): Promise<DemoPageDto> {
    const [data, total] = await this.demoRepository.findAndCount({
      order: { id: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // CN: 执行 demo-database 的 find one 业务逻辑；EN: Runs the find one business logic for demo-database.
  async findOne(id: number): Promise<Demo> {
    const demo = await this.demoRepository.findOneBy({ id });
    if (!demo) {
      throw new NotFoundException(`Demo #${id} not found`);
    }

    return demo;
  }

  // CN: 执行 demo-database 的 find many by ids 业务逻辑；EN: Runs the find many by ids business logic for demo-database.
  async findManyByIds(ids: number[]): Promise<Demo[]> {
    return this.demoRepository.findBy({ id: In(ids) });
  }

  // CN: 执行 demo-database 的 search by name 业务逻辑；EN: Runs the search by name business logic for demo-database.
  async searchByName(keyword: string): Promise<Demo[]> {
    return this.demoRepository
      .createQueryBuilder('demo')
      .where('demo.name LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('demo.id', 'ASC')
      .getMany();
  }

  // CN: 执行 demo-database 的 count 业务逻辑；EN: Runs the count business logic for demo-database.
  async count(): Promise<number> {
    return this.demoRepository.count();
  }

  // CN: 执行 demo-database 的 count summary 业务逻辑；EN: Runs the count summary business logic for demo-database.
  async countSummary(): Promise<DemoCountDto> {
    const count = await this.count();

    return { count };
  }

  // CN: 执行 demo-database 的 parse flag 业务逻辑；EN: Runs the parse flag business logic for demo-database.
  parseFlag(enabled: boolean): DemoFlagDto {
    return { enabled };
  }

  // CN: 执行 demo-database 的 parse uuid 业务逻辑；EN: Runs the parse uuid business logic for demo-database.
  parseUuid(id: string): DemoUuidDto {
    return { id };
  }

  // CN: 执行 demo-database 的 update 业务逻辑；EN: Runs the update business logic for demo-database.
  async update(id: number, updateDemoDto: UpdateDemoDto): Promise<Demo> {
    const demo = await this.findOne(id);
    const updatedDemo = this.demoRepository.merge(demo, updateDemoDto);

    return this.demoRepository.save(updatedDemo);
  }

  // CN: 执行 demo-database 的 remove 业务逻辑；EN: Runs the remove business logic for demo-database.
  async remove(id: number): Promise<void> {
    const result = await this.demoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Demo #${id} not found`);
    }
  }
}
