import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../common/auth/auth.module';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard';
import { DemoWebsocketGateway } from './demo-websocket.gateway';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor';
import { DemoWebsocketServerEventsDoc } from './demo-websocket-server-events.doc';
import { DemoWebsocketService } from './demo-websocket.service';

// CN: 演示认证 Socket.IO 通信；EN: Demonstrates authenticated Socket.IO communication.
@Module({
  imports: [CommonAuthModule],
  providers: [
    DemoWebsocketAuthenticatedGuard,
    DemoWebsocketGateway,
    DemoWebsocketResponseInterceptor,
    DemoWebsocketServerEventsDoc,
    DemoWebsocketService,
  ],
  exports: [DemoWebsocketService],
})
export class DemoWebsocketModule {}
