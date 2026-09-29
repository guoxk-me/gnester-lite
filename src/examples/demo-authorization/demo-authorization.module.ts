import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module.js';
import { AuthorizationModule } from '../../authorization/authorization.module.js';
import { DemoAuthorizationController } from './demo-authorization.controller.js';
import { DemoAuthorizationService } from './demo-authorization.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [DemoAuthorizationController],
  providers: [DemoAuthorizationService],
})
export class DemoAuthorizationModule {}
