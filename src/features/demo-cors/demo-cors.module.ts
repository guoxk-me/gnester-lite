import { Module } from '@nestjs/common';

import { DemoCorsController } from './demo-cors.controller';
import { DemoCorsService } from './demo-cors.service';

// CN: 演示跨域访问场景；EN: Demonstrates CORS access scenarios.
@Module({
  controllers: [DemoCorsController],
  providers: [DemoCorsService],
})
export class DemoCorsModule {}
