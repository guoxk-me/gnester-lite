import { Module } from '@nestjs/common';

import { DemoCookiesController } from './demo-cookies.controller';
import { DemoCookiesService } from './demo-cookies.service';

// CN: 演示 Cookie 读取和写入；EN: Demonstrates cookie reads and writes.
@Module({
  controllers: [DemoCookiesController],
  providers: [DemoCookiesService],
})
export class DemoCookiesModule {}
