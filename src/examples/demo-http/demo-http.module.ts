import { Module } from '@nestjs/common';

import { CommonHttpClientModule } from '../../platform/infrastructure/http-client/http-client.module';
import { DemoHttpController } from './demo-http.controller';
import { DemoHttpService } from './demo-http.service';

@Module({
  // AI modified: the example owns its outbound HTTP client registration.
  imports: [CommonHttpClientModule],
  controllers: [DemoHttpController],
  providers: [DemoHttpService],
})
export class DemoHttpModule {}
