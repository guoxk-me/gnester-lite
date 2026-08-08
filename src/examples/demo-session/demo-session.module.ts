import { Module } from '@nestjs/common';

import { DemoSessionController } from './demo-session.controller';
import { DemoSessionService } from './demo-session.service';

@Module({
  controllers: [DemoSessionController],
  providers: [DemoSessionService],
})
export class DemoSessionModule {}
