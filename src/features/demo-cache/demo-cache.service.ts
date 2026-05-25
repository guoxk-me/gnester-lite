import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { CreateDemoCacheDto } from './dto/create-demo-cache.dto';
import { DemoCacheItemDto } from './dto/demo-cache-item.dto';
import { UpdateDemoCacheDto } from './dto/update-demo-cache.dto';

const DEMO_CACHE_INDEX_KEY = 'demo-cache:index';
const DEMO_CACHE_ITEM_PREFIX = 'demo-cache:item:';

@Injectable()
export class DemoCacheService {
  constructor(private readonly cacheService: CacheService) {}

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

  async remove(key: string): Promise<void> {
    await this.findOne(key);
    await this.cacheService.del(this.getItemKey(key));
    await this.removeFromIndex(key);
  }

  private getItemKey(key: string): string {
    return `${DEMO_CACHE_ITEM_PREFIX}${key}`;
  }

  private async getIndex(): Promise<string[]> {
    return (await this.cacheService.get<string[]>(DEMO_CACHE_INDEX_KEY)) ?? [];
  }

  private async addToIndex(key: string): Promise<void> {
    const keys = await this.getIndex();

    if (keys.includes(key)) {
      return;
    }

    await this.cacheService.set(DEMO_CACHE_INDEX_KEY, [...keys, key]);
  }

  private async removeFromIndex(key: string): Promise<void> {
    const keys = await this.getIndex();

    await this.cacheService.set(
      DEMO_CACHE_INDEX_KEY,
      keys.filter((cachedKey) => cachedKey !== key),
    );
  }
}
