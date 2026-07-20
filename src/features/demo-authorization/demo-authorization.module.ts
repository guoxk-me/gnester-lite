import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../common/auth/auth.module';
import { CommonAuthorizationModule } from '../../common/authorization/authorization.module';
import { DemoAuthorizationController } from './demo-authorization.controller';
import { DemoAuthorizationService } from './demo-authorization.service';

// CN: 演示角色、权限和策略授权；EN: Demonstrates role, permission, and policy authorization.
@Module({
  imports: [CommonAuthModule, CommonAuthorizationModule],
  controllers: [DemoAuthorizationController],
  providers: [DemoAuthorizationService],
})
export class DemoAuthorizationModule {}
