import { Module } from '@nestjs/common';

import { HttpClientModule } from '../../http-client/http-client.module';
import { DemoHttpController } from './demo-http.controller';
import { DemoHttpService } from './demo-http.service';

@Module({
  // AI modified: the example owns its outbound HTTP client registration.
  imports: [HttpClientModule],
  controllers: [DemoHttpController],
  providers: [DemoHttpService],
})
export class DemoHttpModule {}
