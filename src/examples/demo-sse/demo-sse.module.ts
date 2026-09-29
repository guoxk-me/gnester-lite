import { Module } from '@nestjs/common';
import { DemoSseController } from './demo-sse.controller.js';
import { DemoSseService } from './demo-sse.service.js';

@Module({
  controllers: [DemoSseController],
  providers: [DemoSseService],
})
export class DemoSseModule {}
