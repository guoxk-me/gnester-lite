// CN: 测试文件，验证 demo-authorization 的行为契约；EN: Test file verifies behavior contracts for demo-authorization.
import { DemoAuthorizationService } from './demo-authorization.service';

// CN: 测试分组：DemoAuthorizationService；EN: Test group: DemoAuthorizationService.
describe('DemoAuthorizationService', () => {
  let service: DemoAuthorizationService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoAuthorizationService();
  });

  // CN: 测试用例：describes the common Nest authorization scenarios provided by the template；EN: Test case: describes the common Nest authorization scenarios provided by the template.
  it('describes the common Nest authorization scenarios provided by the template', () => {
    const scenarios = service.getScenarios();

    expect(scenarios.map((scenario) => scenario.name)).toEqual([
      'Role based access control',
      'Permission based access control',
      'Policy based resource checks',
    ]);
    expect(scenarios).toEqual(
      expect.arrayContaining([
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

  // CN: 测试用例：returns an admin report only for role-gated handlers；EN: Test case: returns an admin report only for role-gated handlers.
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

  // CN: 测试用例：returns audit entries for permission-gated handlers；EN: Test case: returns audit entries for permission-gated handlers.
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

  // CN: 测试用例：returns a user profile for policy-gated handlers；EN: Test case: returns a user profile for policy-gated handlers.
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
