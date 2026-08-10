import { Module } from '@nestjs/common';

import { DemoCorsController } from './demo-cors.controller';
import { DemoCorsService } from './demo-cors.service';

@Module({
  controllers: [DemoCorsController],
  providers: [DemoCorsService],
})
export class DemoCorsModule {}
