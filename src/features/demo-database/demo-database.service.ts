import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Cache } from 'cache-manager';
import { CronJob } from 'cron';
import { DataSource, In, Repository } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { Demo } from './entities/demo.entity';

@Injectable()
export class DemoDatabaseService {
  private readonly logger = new Logger(DemoDatabaseService.name);

  constructor(
    @InjectRepository(Demo)
    private readonly demoRepository: Repository<Demo>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoRepository.save(createDemoDto);
  }

  async findAll(): Promise<Demo[]> {
    void this.cacheManager.set('foo', 'bar', 0);
    return this.demoRepository.find();
  }

  async findOne(id: number): Promise<Demo> {
    const demo = await this.demoRepository.findOneBy({ id });
    if (!demo) {
      throw new NotFoundException(`Demo #${id} not found`);
    }

    return demo;
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

  // Use transaction to create many demo records. 使用事务创建多条记录。
  async createMany(createDemoDtos: CreateDemoDto[]): Promise<Demo[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const demos = await queryRunner.manager.save(Demo, createDemoDtos);

      await queryRunner.commitTransaction();
      return demos;
    } catch (err) {
      this.logger.error(
        'Failed to create demo records in transaction',
        err instanceof Error ? err.stack : undefined,
      );
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findManyByIds(ids: number[]): Promise<Demo[]> {
    return this.demoRepository.findBy({ id: In(ids) });
  }

  // Use cron expression. 使用 cron 表达式。
  @Cron('45 * * * * *')
  testScheduleTask(): void {
    this.logger.debug('Called when the current second is 45');
  }

  // Use enum. 使用枚举。
  @Cron(CronExpression.EVERY_10_SECONDS)
  testScheduleEnum(): void {
    this.logger.debug('Called every 10 seconds');
  }

  // Use specific date. 使用指定日期。
  @Cron(new Date(Date.now() + 3000))
  testScheduleDate(): void {
    this.logger.debug('Called at a specific date');
  }

  createDynamicCronJob(): void {
    const job = new CronJob('5 * * * * *', () => {
      this.logger.debug('Called every 5 seconds from dynamic job');
    });
    job.start();
  }
}
