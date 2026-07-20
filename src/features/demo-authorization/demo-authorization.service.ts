// CN: 服务，承载 demo-authorization 的业务逻辑；EN: Service holds business logic for demo-authorization.
import { Injectable } from '@nestjs/common';

import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import { DemoAdminReportDto } from './dto/demo-admin-report.dto';
import { DemoAuditLogEntryDto } from './dto/demo-audit-log-entry.dto';
import { DemoAuthorizationScenarioDto } from './dto/demo-authorization-scenario.dto';
import { DemoOwnedProfileDto } from './dto/demo-owned-profile.dto';

@Injectable()
export class DemoAuthorizationService {
  // CN: 执行 demo-authorization 的 get scenarios 业务逻辑；EN: Runs the get scenarios business logic for demo-authorization.
  getScenarios(): DemoAuthorizationScenarioDto[] {
    return [
      {
        name: 'Role based access control',
        method: 'GET',
        route: 'GET /demo-authorization/admin-report',
        useCase:
          'Use coarse-grained roles for administrative or operator-only endpoints.',
        nestPattern: '@Roles() + RolesGuard',
      },
      {
        name: 'Permission based access control',
        method: 'GET',
        route: 'GET /demo-authorization/audit-log',
        useCase:
          'Use fine-grained permissions when multiple roles can share the same allowed action.',
        nestPattern: '@RequirePermissions() + PermissionsGuard',
      },
      {
        name: 'Policy based resource checks',
        method: 'GET',
        route: 'GET /demo-authorization/users/:userId/profile',
        useCase:
          'Use policies for resource ownership, state checks, and multi-factor authorization rules.',
        nestPattern: '@CheckPolicies() + PoliciesGuard',
      },
    ];
  }

  // CN: 执行 demo-authorization 的 get admin report 业务逻辑；EN: Runs the get admin report business logic for demo-authorization.
  getAdminReport(user: JwtAuthenticatedUser): DemoAdminReportDto {
    return {
      generatedFor: user.sub,
      summary: 'Only users with the admin role can read this report.',
    };
  }

  // CN: 执行 demo-authorization 的 get audit log 业务逻辑；EN: Runs the get audit log business logic for demo-authorization.
  getAuditLog(user: JwtAuthenticatedUser): DemoAuditLogEntryDto[] {
    return [
      {
        action: 'demo.authorization.checked',
        actor: user.sub,
        resource: 'audit-log',
      },
    ];
  }

  // CN: 执行 demo-authorization 的 get user profile 业务逻辑；EN: Runs the get user profile business logic for demo-authorization.
  getUserProfile(
    userId: string,
    viewer: JwtAuthenticatedUser,
  ): DemoOwnedProfileDto {
    return {
      id: userId,
      viewedBy: viewer.sub,
      visibility: 'self-or-admin',
    };
  }
}
