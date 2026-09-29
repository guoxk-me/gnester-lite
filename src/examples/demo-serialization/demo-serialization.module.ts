import { Module } from '@nestjs/common';
import { DemoSerializationController } from './demo-serialization.controller.js';
import { DemoSerializationService } from './demo-serialization.service.js';

@Module({
  controllers: [DemoSerializationController],
  providers: [DemoSerializationService],
})
export class DemoSerializationModule {}
