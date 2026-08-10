import { Module } from '@nestjs/common';

import { PermissionsGuard } from './guards/permissions.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [PermissionsGuard, PoliciesGuard, RolesGuard],
  exports: [PermissionsGuard, PoliciesGuard, RolesGuard],
})
export class CommonAuthorizationModule {}
