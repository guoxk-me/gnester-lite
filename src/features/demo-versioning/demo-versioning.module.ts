import { Module } from '@nestjs/common';
import { DemoVersioningController } from './demo-versioning.controller';
import { DemoVersioningService } from './demo-versioning.service';

@Module({
  controllers: [DemoVersioningController],
  providers: [DemoVersioningService],
})
export class DemoVersioningModule {}
