import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl ?? this.getDefaultTtl());
  }

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

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  private getDefaultTtl(): number {
    return this.configService.getOrThrow<number>('cache.ttl');
  }
}
