import { Module } from '@nestjs/common';

import { CommonAuthModule } from '../../common/auth/auth.module';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';
import { LocalStrategy } from './local.strategy';

// CN: 演示 Passport local 登录和 JWT 访问令牌签发；EN: Demonstrates Passport local login and JWT access token issuance.
// AI modified: registered LocalStrategy so LocalAuthGuard can authenticate demo-auth login.
@Module({
  imports: [CommonAuthModule],
  controllers: [DemoAuthController],
  providers: [DemoAuthService, LocalStrategy],
})
export class DemoAuthModule {}
