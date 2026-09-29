import { Module } from '@nestjs/common';
import { DemoRateLimitController } from './demo-rate-limit.controller.js';
import { DemoRateLimitService } from './demo-rate-limit.service.js';

@Module({
  controllers: [DemoRateLimitController],
  providers: [DemoRateLimitService],
})
export class DemoRateLimitModule {}
