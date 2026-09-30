import { Module } from '@nestjs/common';

import { IdentityAdminGuard } from './identity-admin.guard.js';
import { ApplicationAuthModule } from './application-auth.module.js';
import { CsrfModule } from '../../infra/csrf/csrf.module.js';
import {
  AdminInvitationsController,
  AdminUsersController,
  PublicInvitationsController,
  SecurityTokenController,
} from './user-management.controller.js';
import { UserManagementService } from './user-management.service.js';

// AI modified: keep account and invitation writes behind one business ownership boundary.
@Module({
  imports: [ApplicationAuthModule, CsrfModule],
  controllers: [
    AdminUsersController,
    AdminInvitationsController,
    PublicInvitationsController,
    SecurityTokenController,
  ],
  providers: [UserManagementService, IdentityAdminGuard],
})
export class UserManagementModule {}
