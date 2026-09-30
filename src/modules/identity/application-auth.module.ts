import { Module } from '@nestjs/common';

import { AuthModule } from '../../infra/auth/auth.module.js';
import { CsrfModule } from '../../infra/csrf/csrf.module.js';
import { ApplicationAuthService } from './application-auth.service.js';
import { SessionController } from './session.controller.js';
import { SessionAuthGuard } from './session-auth.guard.js';

// AI modified: identity consumes one exported JWT/password infrastructure instance instead of registering duplicates.
@Module({
  imports: [AuthModule, CsrfModule],
  controllers: [SessionController],
  providers: [ApplicationAuthService, SessionAuthGuard],
  exports: [ApplicationAuthService, SessionAuthGuard, AuthModule],
})
export class ApplicationAuthModule {}
