import { Module } from '@nestjs/common';

import { AuthModule } from '../../infra/auth/auth.module.js';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard.js';
import { DemoWebsocketAsyncApiController } from './demo-websocket-asyncapi.controller.js';
import { DemoWebsocketAsyncApiService } from './demo-websocket-asyncapi.service.js';
import { DemoWebsocketGateway } from './demo-websocket.gateway.js';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor.js';
import { DemoWebsocketService } from './demo-websocket.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DemoWebsocketAsyncApiController],
  providers: [
    DemoWebsocketAuthenticatedGuard,
    DemoWebsocketAsyncApiService,
    DemoWebsocketGateway,
    DemoWebsocketResponseInterceptor,
    DemoWebsocketService,
  ],
})
// AI modified: demo websocket state remains private because no other module consumes it.
export class DemoWebsocketModule {}
