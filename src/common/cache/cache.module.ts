import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

// AI modified: keep Redis cache registration and its shared providers in one capability module.
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.getOrThrow<number>('cache.ttl'),
        stores: [new KeyvRedis(configService.getOrThrow<string>('REDIS_URL'))],
      }),
    }),
  ],
  providers: [CacheService, HttpCacheInterceptor],
  exports: [NestCacheModule, CacheService, HttpCacheInterceptor],
})
export class CommonCacheModule {}
