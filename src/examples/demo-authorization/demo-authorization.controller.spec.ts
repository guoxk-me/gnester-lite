import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthGuard } from '../../platform/security/auth/auth.guard';
import { IS_PUBLIC_KEY } from '../../platform/security/auth/decorators/public.decorator';
import { PermissionsGuard } from '../../platform/security/authorization/guards/permissions.guard';
import { PoliciesGuard } from '../../platform/security/authorization/guards/policies.guard';
import { RolesGuard } from '../../platform/security/authorization/guards/roles.guard';
import { DemoAuthorizationController } from './demo-authorization.controller';
import { DemoAuthorizationService } from './demo-authorization.service';

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
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<DemoAuthorizationController>(
      DemoAuthorizationController,
    );
  });

  it('authenticates the controller by default and keeps scenarios public', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, DemoAuthorizationController),
    ).toEqual([AuthGuard]);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        controllerMethodMetadataTarget('getScenarios'),
      ),
    ).toBe(true);
  });

  it('keeps route guards focused on their authorization concern', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        controllerMethodMetadataTarget('getAdminReport'),
      ),
    ).toEqual([RolesGuard]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        controllerMethodMetadataTarget('getAuditLog'),
      ),
    ).toEqual([PermissionsGuard]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        controllerMethodMetadataTarget('getUserProfile'),
      ),
    ).toEqual([PoliciesGuard]);
  });

  it('delegates public scenario listing to the service', () => {
    const scenarios = [
      {
        name: 'Public route escape hatch',
        method: 'GET',
        route: 'GET /demo-authorization/scenarios',
        useCase: 'Expose selected discovery endpoints.',
        nestPattern: 'Controller-level AuthGuard + @Public() escape hatch',
      },
    ];
    service.getScenarios.mockReturnValueOnce(scenarios);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(service.getScenarios).toHaveBeenCalled();
  });

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

function controllerMethodMetadataTarget(
  methodName: keyof DemoAuthorizationController,
): object {
  const method: unknown = Object.getOwnPropertyDescriptor(
    DemoAuthorizationController.prototype,
    methodName,
  )?.value;

  if (typeof method !== 'function') {
    throw new Error(
      `Expected ${String(methodName)} to be a controller method.`,
    );
  }

  return method;
}
