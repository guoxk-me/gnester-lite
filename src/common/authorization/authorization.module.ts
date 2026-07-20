import { Module } from '@nestjs/common';

import { PermissionsGuard } from './guards/permissions.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { RolesGuard } from './guards/roles.guard';

// CN: 授权模块提供角色、权限和策略守卫；EN: Authorization module provides role, permission, and policy guards.
@Module({
  providers: [PermissionsGuard, PoliciesGuard, RolesGuard],
  exports: [PermissionsGuard, PoliciesGuard, RolesGuard],
})
export class CommonAuthorizationModule {}
