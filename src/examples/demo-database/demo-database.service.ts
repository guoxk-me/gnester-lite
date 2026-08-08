import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoCountDto } from './dto/demo-count.dto';
import {
  CreateDemoWithAuditDto,
  DemoNameOnlyDto,
} from './dto/demo-mapped-types.dto';
import { DemoSortOrder } from './dto/list-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { Demo } from './entities/demo.entity';

const SQL_LIKE_ESCAPE_CHARACTER = '!';
export const DEMO_DATABASE_MAX_UNPAGED_RESULTS = 100;

function escapeLikePatternCharacters(keyword: string): string {
  // AI modified: an explicit non-backslash escape keeps literal matching stable across MySQL SQL modes.
  return keyword.replace(
    /[!%_]/g,
    (patternCharacter) => `${SQL_LIKE_ESCAPE_CHARACTER}${patternCharacter}`,
  );
}

@Injectable()
export class DemoDatabaseService {
  private readonly logger = new Logger(DemoDatabaseService.name);

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
    let hasPrimaryError = false;
    let hasCommitted = false;
    let primaryError: unknown;
    let demos: Demo[] = [];

    // AI modified: establish cleanup before connection/transaction startup so every failure releases the runner.
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      demos = await queryRunner.manager.save(Demo, createDemoDtos);
      await queryRunner.commitTransaction();
      hasCommitted = true;
    } catch (error) {
      hasPrimaryError = true;
      primaryError = error;

      if (queryRunner.isTransactionActive) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          // AI modified: preserve the business failure while still recording rollback failure.
          this.reportTransactionCleanupFailure(
            'Failed to roll back demo transaction',
            rollbackError,
          );
        }
      }
    }

    try {
      await queryRunner.release();
    } catch (releaseError) {
      if (!hasPrimaryError && !hasCommitted) {
        throw releaseError;
      }

      // AI modified: a release failure cannot turn a confirmed commit into an apparent write failure.
      this.reportTransactionCleanupFailure(
        'Failed to release demo query runner',
        releaseError,
      );
    }

    if (hasPrimaryError) {
      throw primaryError;
    }

    return demos;
  }

  private reportTransactionCleanupFailure(
    message: string,
    error: unknown,
  ): void {
    try {
      this.logger.error(
        message,
        error instanceof Error ? error.stack : String(error),
      );
    } catch {
      // AI modified: diagnostics cannot replace the transaction error being preserved.
    }
  }

  async findAll(): Promise<Demo[]> {
    // AI modified: legacy unpaged reads remain deterministic and cannot materialize the whole table.
    return this.demoRepository.find({
      order: { id: DemoSortOrder.Asc },
      take: DEMO_DATABASE_MAX_UNPAGED_RESULTS,
    });
  }

  async findPage(
    page: number,
    limit: number,
    order: DemoSortOrder = DemoSortOrder.Asc,
  ): Promise<{
    data: Demo[];
    total: number;
    page: number;
    limit: number;
  }> {
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
    const literalKeyword = escapeLikePatternCharacters(keyword);

    return this.demoRepository
      .createQueryBuilder('demo')
      .where(`demo.name LIKE :keyword ESCAPE '${SQL_LIKE_ESCAPE_CHARACTER}'`, {
        keyword: `%${literalKeyword}%`,
      })
      .orderBy('demo.id', 'ASC')
      .limit(DEMO_DATABASE_MAX_UNPAGED_RESULTS)
      .getMany();
  }

  async count(): Promise<number> {
    return this.demoRepository.count();
  }

  async countSummary(): Promise<DemoCountDto> {
    const count = await this.count();

    return { count };
  }

  async update(id: number, updateDemoDto: UpdateDemoDto): Promise<Demo> {
    if (Object.keys(updateDemoDto).length === 0) {
      return this.findOne(id);
    }

    // AI modified: update only submitted columns so a stale entity cannot overwrite concurrent changes or recreate a deletion.
    await this.demoRepository.update({ id }, updateDemoDto);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.demoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Demo #${id} not found`);
    }
  }
}
