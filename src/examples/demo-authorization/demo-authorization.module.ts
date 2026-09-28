import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { DemoAuthorizationController } from './demo-authorization.controller';
import { DemoAuthorizationService } from './demo-authorization.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [DemoAuthorizationController],
  providers: [DemoAuthorizationService],
})
export class DemoAuthorizationModule {}
