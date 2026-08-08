import { Module } from '@nestjs/common';

import { DemoCookiesController } from './demo-cookies.controller';
import { DemoCookiesService } from './demo-cookies.service';

@Module({
  controllers: [DemoCookiesController],
  providers: [DemoCookiesService],
})
export class DemoCookiesModule {}
