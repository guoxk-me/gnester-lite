import { DemoAuthorizationService } from './demo-authorization.service';

describe('DemoAuthorizationService', () => {
  let service: DemoAuthorizationService;

  beforeEach(() => {
    service = new DemoAuthorizationService();
  });

  it('describes the common Nest authorization scenarios provided by the template', () => {
    const scenarios = service.getScenarios();

    expect(scenarios.map((scenario) => scenario.name)).toEqual([
      'Public route escape hatch',
      'Role based access control',
      'Permission based access control',
      'Policy based resource checks',
    ]);
    expect(scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: 'GET /demo-authorization/scenarios',
          nestPattern: 'Controller-level AuthGuard + @Public() escape hatch',
        }),
        expect.objectContaining({
          route: 'GET /demo-authorization/admin-report',
          nestPattern: '@Roles() + RolesGuard',
        }),
        expect.objectContaining({
          route: 'GET /demo-authorization/audit-log',
          nestPattern: '@RequirePermissions() + PermissionsGuard',
        }),
        expect.objectContaining({
          route: 'GET /demo-authorization/users/:userId/profile',
          nestPattern: '@CheckPolicies() + PoliciesGuard',
        }),
      ]),
    );
  });

  it('returns an admin report only for role-gated handlers', () => {
    expect(
      service.getAdminReport({
        sub: 'demo-admin',
        username: 'admin@example.com',
        roles: ['admin'],
      }),
    ).toEqual({
      generatedFor: 'demo-admin',
      summary: 'Only users with the admin role can read this report.',
    });
  });

  it('returns audit entries for permission-gated handlers', () => {
    expect(
      service.getAuditLog({
        sub: 'demo-admin',
        username: 'admin@example.com',
        permissions: ['audit:read'],
      }),
    ).toEqual([
      {
        action: 'demo.authorization.checked',
        actor: 'demo-admin',
        resource: 'audit-log',
      },
    ]);
  });

  it('returns a user profile for policy-gated handlers', () => {
    expect(
      service.getUserProfile('demo-user', {
        sub: 'demo-user',
        username: 'user@example.com',
      }),
    ).toEqual({
      id: 'demo-user',
      viewedBy: 'demo-user',
      visibility: 'self-or-admin',
    });
  });
});
