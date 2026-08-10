import { Module } from '@nestjs/common';
import { DemoSecurityController } from './demo-security.controller';
import { DemoSecurityService } from './demo-security.service';

@Module({
  controllers: [DemoSecurityController],
  providers: [DemoSecurityService],
})
export class DemoSecurityModule {}
