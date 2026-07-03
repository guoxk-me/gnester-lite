import { Module } from '@nestjs/common';
import { DemoHttpController } from './demo-http.controller';
import { DemoHttpService } from './demo-http.service';

// CN: 演示外部 HTTP 调用；EN: Demonstrates outbound HTTP calls.
@Module({
  controllers: [DemoHttpController],
  providers: [DemoHttpService],
})
export class DemoHttpModule {}
