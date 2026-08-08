import { Module } from '@nestjs/common';

import { BetterAuthService } from './better-auth.service';

// AI modified: expose Better Auth without registering a competing global authentication guard.
@Module({
  providers: [BetterAuthService],
  exports: [BetterAuthService],
})
export class CommonBetterAuthModule {}
