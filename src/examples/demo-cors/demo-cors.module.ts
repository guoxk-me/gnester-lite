import { Module } from '@nestjs/common';

import { DemoCorsController } from './demo-cors.controller.js';
import { DemoCorsService } from './demo-cors.service.js';

@Module({
  controllers: [DemoCorsController],
  providers: [DemoCorsService],
})
export class DemoCorsModule {}
