import { Module } from '@nestjs/common';

import { ApplicationAuthModule } from './application-auth.module.js';
import { UserManagementModule } from './user-management.module.js';

// AI modified: accounts, invitations and sessions share one identity ownership boundary.
@Module({
  imports: [ApplicationAuthModule, UserManagementModule],
  exports: [ApplicationAuthModule],
})
export class IdentityModule {}
