import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../common/auth/auth.module';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';

// CN: 演示登录和访问令牌签发；EN: Demonstrates sign-in and access token issuance.
@Module({
  imports: [CommonAuthModule],
  controllers: [DemoAuthController],
  providers: [DemoAuthService],
})
export class DemoAuthModule {}
