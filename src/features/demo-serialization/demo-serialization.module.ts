import { Module } from '@nestjs/common';
import { DemoSerializationController } from './demo-serialization.controller';
import { DemoSerializationService } from './demo-serialization.service';

// CN: 演示响应序列化整形；EN: Demonstrates response serialization shaping.
@Module({
  controllers: [DemoSerializationController],
  providers: [DemoSerializationService],
})
export class DemoSerializationModule {}
