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
  constructor(
    @InjectRepository(Demo)
    private readonly demoRepository: Repository<Demo>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoRepository.save(createDemoDto);
  }

  async createWithAudit(createDemoDto: CreateDemoWithAuditDto): Promise<Demo> {
    return this.create({
      name: createDemoDto.name,
      description: createDemoDto.description,
    });
  }

  createNameOnly(demoNameOnlyDto: DemoNameOnlyDto): DemoNameOnlyDto {
    return demoNameOnlyDto;
  }

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

  async findAll(): Promise<Demo[]> {
    return this.demoRepository.find();
  }

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

  async findOne(id: number): Promise<Demo> {
    const demo = await this.demoRepository.findOneBy({ id });
    if (!demo) {
      throw new NotFoundException(`Demo #${id} not found`);
    }

    return demo;
  }

  async findManyByIds(ids: number[]): Promise<Demo[]> {
    return this.demoRepository.findBy({ id: In(ids) });
  }

  async searchByName(keyword: string): Promise<Demo[]> {
    return this.demoRepository
      .createQueryBuilder('demo')
      .where('demo.name LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('demo.id', 'ASC')
      .getMany();
  }

  async count(): Promise<number> {
    return this.demoRepository.count();
  }

  async countSummary(): Promise<DemoCountDto> {
    const count = await this.count();

    return { count };
  }

  parseFlag(enabled: boolean): DemoFlagDto {
    return { enabled };
  }

  parseUuid(id: string): DemoUuidDto {
    return { id };
  }

  async update(id: number, updateDemoDto: UpdateDemoDto): Promise<Demo> {
    const demo = await this.findOne(id);
    const updatedDemo = this.demoRepository.merge(demo, updateDemoDto);

    return this.demoRepository.save(updatedDemo);
  }

  async remove(id: number): Promise<void> {
    const result = await this.demoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Demo #${id} not found`);
    }
  }
}
