import { Injectable } from '@nestjs/common';

import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import { DemoAdminReportDto } from './dto/demo-admin-report.dto';
import { DemoAuditLogEntryDto } from './dto/demo-audit-log-entry.dto';
import { DemoAuthorizationScenarioDto } from './dto/demo-authorization-scenario.dto';
import { DemoOwnedProfileDto } from './dto/demo-owned-profile.dto';

@Injectable()
export class DemoAuthorizationService {
  getScenarios(): DemoAuthorizationScenarioDto[] {
    return [
      // AI modified: document default authentication and the intentional public escape.
      {
        name: 'Public route escape hatch',
        method: 'GET',
        route: 'GET /demo-authorization/scenarios',
        useCase:
          'Keep an explicitly selected discovery endpoint public while the controller requires authentication by default.',
        nestPattern: 'Controller-level AuthGuard + @Public() escape hatch',
      },
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

  getAdminReport(user: JwtAuthenticatedUser): DemoAdminReportDto {
    return {
      generatedFor: user.sub,
      summary: 'Only users with the admin role can read this report.',
    };
  }

  getAuditLog(user: JwtAuthenticatedUser): DemoAuditLogEntryDto[] {
    return [
      {
        action: 'demo.authorization.checked',
        actor: user.sub,
        resource: 'audit-log',
      },
    ];
  }

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
