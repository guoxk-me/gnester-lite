import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RateLimitConfig } from 'config/config.types';
import { createThrottlerModuleOptions } from './rate-limit.config';

// CN: 限流模块保护接口免受高频滥用；EN: Rate-limit module protects endpoints from high-frequency abuse.
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createThrottlerModuleOptions(
          configService.getOrThrow<RateLimitConfig>('rateLimit'),
        ),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class CommonRateLimitModule {}
