import { Module } from '@nestjs/common';
import { DemoConfigController } from './demo-config.controller';
import { DemoConfigService } from './demo-config.service';

@Module({
  controllers: [DemoConfigController],
  providers: [DemoConfigService],
})
export class DemoConfigModule {}
