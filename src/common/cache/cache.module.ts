import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

// CN: 缓存模块封装缓存读写和 HTTP 缓存；EN: Cache module wraps cache access and HTTP caching.
@Global()
@Module({
  providers: [CacheService, HttpCacheInterceptor],
  exports: [CacheService, HttpCacheInterceptor],
})
export class CommonCacheModule {}
