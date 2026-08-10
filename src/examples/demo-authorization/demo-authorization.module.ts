import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../platform/security/auth/auth.module';
import { CommonAuthorizationModule } from '../../platform/security/authorization/authorization.module';
import { DemoAuthorizationController } from './demo-authorization.controller';
import { DemoAuthorizationService } from './demo-authorization.service';

@Module({
  imports: [CommonAuthModule, CommonAuthorizationModule],
  controllers: [DemoAuthorizationController],
  providers: [DemoAuthorizationService],
})
export class DemoAuthorizationModule {}
