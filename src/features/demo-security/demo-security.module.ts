import { Module } from '@nestjs/common';
import { DemoSecurityController } from './demo-security.controller';
import { DemoSecurityService } from './demo-security.service';

// CN: 演示安全响应头和中间件效果；EN: Demonstrates security headers and middleware effects.
@Module({
  controllers: [DemoSecurityController],
  providers: [DemoSecurityService],
})
export class DemoSecurityModule {}
