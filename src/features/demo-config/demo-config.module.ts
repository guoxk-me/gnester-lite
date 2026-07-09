import { Module } from '@nestjs/common';
import { DemoConfigController } from './demo-config.controller';
import { DemoConfigService } from './demo-config.service';

// CN: 演示类型化配置读取；EN: Demonstrates typed configuration access.
@Module({
  controllers: [DemoConfigController],
  providers: [DemoConfigService],
})
export class DemoConfigModule {}
