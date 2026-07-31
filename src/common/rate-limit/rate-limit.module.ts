import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitConfig } from 'config/config.types';
import { HttpThrottlerGuard } from './http-throttler.guard';
import { createThrottlerModuleOptions } from './rate-limit.config';

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
      // AI modified: apply the HTTP limiter only where its response-header contract is valid.
      useClass: HttpThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class CommonRateLimitModule {}
