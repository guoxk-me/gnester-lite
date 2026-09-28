import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LocalStrategy } from './local.strategy';

// AI modified: registered LocalStrategy so LocalAuthGuard can authenticate demo-auth login.
@Module({
  imports: [AuthModule],
  controllers: [DemoAuthController],
  providers: [DemoAuthService, LocalAuthGuard, LocalStrategy],
})
export class DemoAuthModule {}
