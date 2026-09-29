import { Module } from '@nestjs/common';

import { BetterAuthService } from './better-auth.service.js';

// AI modified: expose Better Auth without registering a competing global authentication guard.
@Module({
  providers: [BetterAuthService],
  exports: [BetterAuthService],
})
export class BetterAuthModule {}
