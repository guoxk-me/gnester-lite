import { Module } from '@nestjs/common';

import { DemoCookiesController } from './demo-cookies.controller.js';
import { DemoCookiesService } from './demo-cookies.service.js';

@Module({
  controllers: [DemoCookiesController],
  providers: [DemoCookiesService],
})
export class DemoCookiesModule {}
