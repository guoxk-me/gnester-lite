// CN: 服务，承载 demo-cache 的业务逻辑；EN: Service holds business logic for demo-cache.
import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { CreateDemoCacheDto } from './dto/create-demo-cache.dto';
import { DemoCacheItemDto } from './dto/demo-cache-item.dto';
import { UpdateDemoCacheDto } from './dto/update-demo-cache.dto';

const DEMO_CACHE_INDEX_KEY = 'demo-cache:index';
const DEMO_CACHE_ITEM_PREFIX = 'demo-cache:item:';

@Injectable()
export class DemoCacheService {
  // CN: 初始化 demo-cache 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-cache.
  constructor(private readonly cacheService: CacheService) {}

  // CN: 执行 demo-cache 的 create 业务逻辑；EN: Runs the create business logic for demo-cache.
  async create(
    createDemoCacheDto: CreateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    await this.cacheService.set(
      this.getItemKey(createDemoCacheDto.key),
      createDemoCacheDto.value,
    );
    await this.addToIndex(createDemoCacheDto.key);

    return {
      key: createDemoCacheDto.key,
      value: createDemoCacheDto.value,
    };
  }

  // CN: 执行 demo-cache 的 find all 业务逻辑；EN: Runs the find all business logic for demo-cache.
  async findAll(): Promise<DemoCacheItemDto[]> {
    const keys = await this.getIndex();
    const items = await Promise.all(
      keys.map(async (key) => {
        const value = await this.cacheService.get<string>(this.getItemKey(key));

        return value === undefined || value === null
          ? undefined
          : { key, value };
      }),
    );

    return items.filter((item): item is DemoCacheItemDto => item !== undefined);
  }

  // CN: 执行 demo-cache 的 find one 业务逻辑；EN: Runs the find one business logic for demo-cache.
  async findOne(key: string): Promise<DemoCacheItemDto> {
    const value = await this.cacheService.get<string>(this.getItemKey(key));

    if (value === undefined || value === null) {
      throw new NotFoundException(`Demo cache item "${key}" not found`);
    }

    return {
      key,
      value,
    };
  }

  // CN: 执行 demo-cache 的 update 业务逻辑；EN: Runs the update business logic for demo-cache.
  async update(
    key: string,
    updateDemoCacheDto: UpdateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    await this.findOne(key);
    await this.cacheService.set(this.getItemKey(key), updateDemoCacheDto.value);

    return {
      key,
      value: updateDemoCacheDto.value,
    };
  }

  // CN: 执行 demo-cache 的 remove 业务逻辑；EN: Runs the remove business logic for demo-cache.
  async remove(key: string): Promise<void> {
    await this.findOne(key);
    await this.cacheService.del(this.getItemKey(key));
    await this.removeFromIndex(key);
  }

  // CN: 执行 demo-cache 的 get item key 业务逻辑；EN: Runs the get item key business logic for demo-cache.
  private getItemKey(key: string): string {
    return `${DEMO_CACHE_ITEM_PREFIX}${key}`;
  }

  // CN: 执行 demo-cache 的 get index 业务逻辑；EN: Runs the get index business logic for demo-cache.
  private async getIndex(): Promise<string[]> {
    return (await this.cacheService.get<string[]>(DEMO_CACHE_INDEX_KEY)) ?? [];
  }

  // CN: 执行 demo-cache 的 add to index 业务逻辑；EN: Runs the add to index business logic for demo-cache.
  private async addToIndex(key: string): Promise<void> {
    const keys = await this.getIndex();

    if (keys.includes(key)) {
      return;
    }

    await this.cacheService.set(DEMO_CACHE_INDEX_KEY, [...keys, key]);
  }

  // CN: 执行 demo-cache 的 remove from index 业务逻辑；EN: Runs the remove from index business logic for demo-cache.
  private async removeFromIndex(key: string): Promise<void> {
    const keys = await this.getIndex();

    await this.cacheService.set(
      DEMO_CACHE_INDEX_KEY,
      keys.filter((cachedKey) => cachedKey !== key),
    );
  }
}
