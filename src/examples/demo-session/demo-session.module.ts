import { Module } from '@nestjs/common';

import { DemoSessionController } from './demo-session.controller.js';
import { DemoSessionService } from './demo-session.service.js';

@Module({
  controllers: [DemoSessionController],
  providers: [DemoSessionService],
})
export class DemoSessionModule {}
