import { Module } from '@nestjs/common';

import { DemoSessionController } from './demo-session.controller';
import { DemoSessionService } from './demo-session.service';

// CN: 演示服务端会话状态；EN: Demonstrates server-side session state.
@Module({
  controllers: [DemoSessionController],
  providers: [DemoSessionService],
})
export class DemoSessionModule {}
