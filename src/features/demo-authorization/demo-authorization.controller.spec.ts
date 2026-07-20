// CN: 测试文件，验证 demo-authorization 的行为契约；EN: Test file verifies behavior contracts for demo-authorization.
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from '../../common/auth/auth.guard';
import { PermissionsGuard } from '../../common/authorization/guards/permissions.guard';
import { PoliciesGuard } from '../../common/authorization/guards/policies.guard';
import { RolesGuard } from '../../common/authorization/guards/roles.guard';
import { DemoAuthorizationController } from './demo-authorization.controller';
import { DemoAuthorizationService } from './demo-authorization.service';

// CN: 测试分组：DemoAuthorizationController；EN: Test group: DemoAuthorizationController.
describe('DemoAuthorizationController', () => {
  const service: jest.Mocked<
    Pick<
      DemoAuthorizationService,
      'getScenarios' | 'getAdminReport' | 'getAuditLog' | 'getUserProfile'
    >
  > = {
    getScenarios: jest.fn(),
    getAdminReport: jest.fn(),
    getAuditLog: jest.fn(),
    getUserProfile: jest.fn(),
  };
  let controller: DemoAuthorizationController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoAuthorizationController],
      providers: [
        {
          provide: DemoAuthorizationService,
          useValue: service,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PoliciesGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<DemoAuthorizationController>(
      DemoAuthorizationController,
    );
  });

  // CN: 测试用例：delegates public scenario listing to the service；EN: Test case: delegates public scenario listing to the service.
  it('delegates public scenario listing to the service', () => {
    const scenarios = [
      {
        name: 'Role based access control',
        method: 'GET',
        route: 'GET /demo-authorization/admin-report',
        useCase: 'Restrict administrative actions to operators.',
        nestPattern: '@Roles() + RolesGuard',
      },
    ];
    service.getScenarios.mockReturnValueOnce(scenarios);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates role-protected admin report reads to the service；EN: Test case: delegates role-protected admin report reads to the service.
  it('delegates role-protected admin report reads to the service', () => {
    const user = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
    };
    service.getAdminReport.mockReturnValueOnce({
      generatedFor: 'demo-admin',
      summary: 'Only users with the admin role can read this report.',
    });

    expect(controller.getAdminReport(user)).toEqual({
      generatedFor: 'demo-admin',
      summary: 'Only users with the admin role can read this report.',
    });
    expect(service.getAdminReport).toHaveBeenCalledWith(user);
  });

  // CN: 测试用例：delegates permission-protected audit log reads to the service；EN: Test case: delegates permission-protected audit log reads to the service.
  it('delegates permission-protected audit log reads to the service', () => {
    const user = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      permissions: ['audit:read'],
    };
    service.getAuditLog.mockReturnValueOnce([]);

    expect(controller.getAuditLog(user)).toEqual([]);
    expect(service.getAuditLog).toHaveBeenCalledWith(user);
  });

  // CN: 测试用例：delegates policy-protected profile reads to the service；EN: Test case: delegates policy-protected profile reads to the service.
  it('delegates policy-protected profile reads to the service', () => {
    const user = {
      sub: 'demo-user',
      username: 'user@example.com',
    };
    service.getUserProfile.mockReturnValueOnce({
      id: 'demo-user',
      viewedBy: 'demo-user',
      visibility: 'self-or-admin',
    });

    expect(controller.getUserProfile('demo-user', user)).toEqual({
      id: 'demo-user',
      viewedBy: 'demo-user',
      visibility: 'self-or-admin',
    });
    expect(service.getUserProfile).toHaveBeenCalledWith('demo-user', user);
  });
});
