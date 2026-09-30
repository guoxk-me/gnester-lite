import { Module } from '@nestjs/common';

import { HttpClientModule } from '../../infra/http-client/http-client.module.js';
import { DemoHttpController } from './demo-http.controller.js';
import { DemoHttpService } from './demo-http.service.js';

@Module({
  // AI modified: the example owns its outbound HTTP client registration.
  imports: [HttpClientModule],
  controllers: [DemoHttpController],
  providers: [DemoHttpService],
})
export class DemoHttpModule {}
