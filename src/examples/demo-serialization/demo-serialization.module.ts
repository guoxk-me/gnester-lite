import { Module } from '@nestjs/common';
import { DemoSerializationController } from './demo-serialization.controller';
import { DemoSerializationService } from './demo-serialization.service';

@Module({
  controllers: [DemoSerializationController],
  providers: [DemoSerializationService],
})
export class DemoSerializationModule {}
