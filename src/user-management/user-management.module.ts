import { Module } from '@nestjs/common';

import { BetterAuthModule } from '../better-auth/better-auth.module.js';
import { CsrfModule } from '../csrf/csrf.module.js';
import {
  AdminInvitationsController,
  AdminUsersController,
  PublicInvitationsController,
  SecurityTokenController,
} from './user-management.controller.js';
import { UserManagementService } from './user-management.service.js';

// AI modified: keep account and invitation writes behind one business ownership boundary.
@Module({
  imports: [BetterAuthModule, CsrfModule],
  controllers: [
    AdminUsersController,
    AdminInvitationsController,
    PublicInvitationsController,
    SecurityTokenController,
  ],
  providers: [UserManagementService],
})
export class UserManagementModule {}
