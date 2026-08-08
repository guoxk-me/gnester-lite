import { Module } from '@nestjs/common';
import { DemoSseController } from './demo-sse.controller';
import { DemoSseService } from './demo-sse.service';

@Module({
  controllers: [DemoSseController],
  providers: [DemoSseService],
})
export class DemoSseModule {}
