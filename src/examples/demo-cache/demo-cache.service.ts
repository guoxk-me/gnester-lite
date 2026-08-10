import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CacheService } from '../../platform/infrastructure/cache/cache.service';
import { CreateDemoCacheDto } from './dto/create-demo-cache.dto';
import { DemoCacheItemDto } from './dto/demo-cache-item.dto';
import { DemoHttpCacheResponseDto } from './dto/demo-http-cache-response.dto';
import { UpdateDemoCacheDto } from './dto/update-demo-cache.dto';

// AI modified: the shared hash tag keeps each atomic item/index script in one Redis Cluster slot.
const DEMO_CACHE_INDEX_KEY = 'demo-cache:{items}:index';
const DEMO_CACHE_ITEM_PREFIX = 'demo-cache:{items}:item:';
export const DEMO_CACHE_MAX_ENTRIES = 100;

@Injectable()
export class DemoCacheService {
  constructor(private readonly cacheService: CacheService) {}

  async create(
    createDemoCacheDto: CreateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    let isStored = await this.cacheService.setIndexedValue(
      DEMO_CACHE_INDEX_KEY,
      createDemoCacheDto.key,
      this.getItemKey(createDemoCacheDto.key),
      createDemoCacheDto.value,
      { maximumEntries: DEMO_CACHE_MAX_ENTRIES },
    );

    if (!isStored) {
      // AI modified: remove expired index members before making one bounded admission retry.
      await this.findAll();
      isStored = await this.cacheService.setIndexedValue(
        DEMO_CACHE_INDEX_KEY,
        createDemoCacheDto.key,
        this.getItemKey(createDemoCacheDto.key),
        createDemoCacheDto.value,
        { maximumEntries: DEMO_CACHE_MAX_ENTRIES },
      );
    }

    if (!isStored) {
      throw new ConflictException(
        `Demo cache can hold at most ${DEMO_CACHE_MAX_ENTRIES} entries.`,
      );
    }

    return {
      key: createDemoCacheDto.key,
      value: createDemoCacheDto.value,
    };
  }

  async findAll(): Promise<DemoCacheItemDto[]> {
    const keys = (
      await this.cacheService.getIndexMembers(
        DEMO_CACHE_INDEX_KEY,
        DEMO_CACHE_MAX_ENTRIES,
      )
    ).sort((left, right) => left.localeCompare(right));
    const items = await Promise.all(
      keys.map(async (key) => {
        const value = await this.cacheService.get<string>(this.getItemKey(key));

        return value === undefined || value === null
          ? undefined
          : { key, value };
      }),
    );

    const missingKeys = keys.filter((_, index) => items[index] === undefined);
    await Promise.all(
      missingKeys.map((key) =>
        this.cacheService.removeIndexMemberIfItemMissing(
          DEMO_CACHE_INDEX_KEY,
          key,
          this.getItemKey(key),
        ),
      ),
    );

    return items.filter((item): item is DemoCacheItemDto => item !== undefined);
  }

  getHttpResponse(variant: string): DemoHttpCacheResponseDto {
    return {
      variant,
      generatedAt: new Date().toISOString(),
      cacheTtlMilliseconds: 5_000,
    };
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
    const isStored = await this.cacheService.setIndexedValue(
      DEMO_CACHE_INDEX_KEY,
      key,
      this.getItemKey(key),
      updateDemoCacheDto.value,
      { maximumEntries: DEMO_CACHE_MAX_ENTRIES },
    );

    if (!isStored) {
      throw new ConflictException(
        `Demo cache can hold at most ${DEMO_CACHE_MAX_ENTRIES} entries.`,
      );
    }

    return {
      key,
      value: updateDemoCacheDto.value,
    };
  }

  async remove(key: string): Promise<void> {
    await this.findOne(key);
    await this.cacheService.deleteIndexedValue(
      DEMO_CACHE_INDEX_KEY,
      key,
      this.getItemKey(key),
    );
  }

  private getItemKey(key: string): string {
    return `${DEMO_CACHE_ITEM_PREFIX}${key}`;
  }
}
