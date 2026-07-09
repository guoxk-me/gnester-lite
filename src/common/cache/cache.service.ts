// CN: 服务，承载 cache common 的业务逻辑；EN: Service holds business logic for cache common.
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  // CN: 初始化 cache common 的依赖和运行状态；EN: Initializes dependencies and runtime state for cache common.
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  // CN: 执行 cache common 的 get 业务逻辑；EN: Runs the get business logic for cache common.
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  // CN: 执行 cache common 的 set 业务逻辑；EN: Runs the set business logic for cache common.
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl ?? this.getDefaultTtl());
  }

  // CN: 执行 cache common 的 remember 业务逻辑；EN: Runs the remember business logic for cache common.
  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);

    if (cachedValue !== undefined && cachedValue !== null) {
      return cachedValue;
    }

    const value = await factory();
    await this.set(key, value, ttl);

    return value;
  }

  // CN: 执行 cache common 的 del 业务逻辑；EN: Runs the del business logic for cache common.
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // CN: 执行 cache common 的 clear 业务逻辑；EN: Runs the clear business logic for cache common.
  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  // CN: 执行 cache common 的 get default ttl 业务逻辑；EN: Runs the get default ttl business logic for cache common.
  private getDefaultTtl(): number {
    return this.configService.getOrThrow<number>('cache.ttl');
  }
}
