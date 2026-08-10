import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../platform/security/auth/auth.module';
import { DemoWebsocketAuthenticatedGuard } from './demo-websocket-authenticated.guard';
import { DemoWebsocketAsyncApiController } from './demo-websocket-asyncapi.controller';
import { DemoWebsocketAsyncApiService } from './demo-websocket-asyncapi.service';
import { DemoWebsocketGateway } from './demo-websocket.gateway';
import { DemoWebsocketResponseInterceptor } from './demo-websocket-response.interceptor';
import { DemoWebsocketService } from './demo-websocket.service';

@Module({
  imports: [CommonAuthModule],
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
