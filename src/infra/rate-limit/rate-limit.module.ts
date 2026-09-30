import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import type { RateLimitConfig } from '../../config/application-config.types.js';
import { HttpThrottlerGuard } from './http-throttler.guard.js';
import { createThrottlerModuleOptions } from './rate-limit.config.js';

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
export class RateLimitModule {}
