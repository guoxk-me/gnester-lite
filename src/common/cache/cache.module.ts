import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis, { Keyv } from '@keyv/redis';

import {
  CACHE_REDIS_CONNECT_TIMEOUT_MS,
  getCacheNamespace,
  getCacheRedisConnectionOptions,
} from './cache-connection';
import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

// AI modified: keep Redis cache registration and its shared providers in one capability module.
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = configService.getOrThrow<number>('cache.ttl');
        // AI modified: isolate cache keys when applications or environments share Redis.
        const namespace = getCacheNamespace(
          configService.getOrThrow<string>('app.name'),
          configService.getOrThrow<string>('NODE_ENV'),
        );
        const redisStore = new KeyvRedis(
          getCacheRedisConnectionOptions(
            configService.getOrThrow<string>('REDIS_URL'),
          ),
          {
            connectionTimeout: CACHE_REDIS_CONNECT_TIMEOUT_MS,
            throwOnConnectError: true,
            throwOnErrors: true,
          },
        );

        return {
          ttl,
          // AI modified: propagate Redis failures so callers and readiness cannot mistake no-op writes for success.
          stores: [
            new Keyv({
              namespace,
              store: redisStore,
              throwOnErrors: true,
              ttl,
            }),
          ],
        };
      },
    }),
  ],
  providers: [CacheService, HttpCacheInterceptor],
  exports: [NestCacheModule, CacheService, HttpCacheInterceptor],
})
export class CommonCacheModule {}
