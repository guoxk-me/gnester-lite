import { Module } from '@nestjs/common';
import { DemoRateLimitController } from './demo-rate-limit.controller';
import { DemoRateLimitService } from './demo-rate-limit.service';

@Module({
  controllers: [DemoRateLimitController],
  providers: [DemoRateLimitService],
})
export class DemoRateLimitModule {}
