import { Module } from '@nestjs/common';
import { DemoSecurityController } from './demo-security.controller.js';
import { DemoSecurityService } from './demo-security.service.js';

@Module({
  controllers: [DemoSecurityController],
  providers: [DemoSecurityService],
})
export class DemoSecurityModule {}
