import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

@Global()
@Module({
  providers: [CacheService, HttpCacheInterceptor],
  exports: [CacheService, HttpCacheInterceptor],
})
export class CommonCacheModule {}
