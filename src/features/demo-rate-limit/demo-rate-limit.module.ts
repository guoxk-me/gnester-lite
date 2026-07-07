import { Module } from '@nestjs/common';
import { DemoRateLimitController } from './demo-rate-limit.controller';
import { DemoRateLimitService } from './demo-rate-limit.service';

// CN: 演示接口限流行为；EN: Demonstrates endpoint rate limiting.
@Module({
  controllers: [DemoRateLimitController],
  providers: [DemoRateLimitService],
})
export class DemoRateLimitModule {}
