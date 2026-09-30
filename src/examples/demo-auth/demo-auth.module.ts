import { Module } from '@nestjs/common';

import { AuthModule } from '../../infra/auth/auth.module.js';
import { DemoAuthController } from './demo-auth.controller.js';
import { DemoAuthService } from './demo-auth.service.js';
import { LocalAuthGuard } from './local-auth.guard.js';
import { LocalStrategy } from './local.strategy.js';

// AI modified: registered LocalStrategy so LocalAuthGuard can authenticate demo-auth login.
@Module({
  imports: [AuthModule],
  controllers: [DemoAuthController],
  providers: [DemoAuthService, LocalAuthGuard, LocalStrategy],
})
export class DemoAuthModule {}
