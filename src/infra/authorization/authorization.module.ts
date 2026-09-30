import { Module } from '@nestjs/common';

import { PermissionsGuard } from './guards/permissions.guard.js';
import { PoliciesGuard } from './guards/policies.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  providers: [PermissionsGuard, PoliciesGuard, RolesGuard],
  exports: [PermissionsGuard, PoliciesGuard, RolesGuard],
})
export class AuthorizationModule {}
