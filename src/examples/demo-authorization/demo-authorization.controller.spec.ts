import type { Mocked } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthGuard } from '../../auth/auth.guard.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { PermissionsGuard } from '../../authorization/guards/permissions.guard.js';
import { PoliciesGuard } from '../../authorization/guards/policies.guard.js';
import { RolesGuard } from '../../authorization/guards/roles.guard.js';
import { DemoAuthorizationController } from './demo-authorization.controller.js';
import { DemoAuthorizationService } from './demo-authorization.service.js';

describe('DemoAuthorizationController', () => {
  const service = {
    getScenarios: vi.fn(),
    getAdminReport: vi.fn(),
    getAuditLog: vi.fn(),
    getUserProfile: vi.fn(),
  } as Mocked<
    Pick<
      DemoAuthorizationService,
      'getScenarios' | 'getAdminReport' | 'getAuditLog' | 'getUserProfile'
    >
  >;
  let controller: DemoAuthorizationController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoAuthorizationController],
      providers: [
        {
          provide: DemoAuthorizationService,
          useValue: service,
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: vi.fn().mockReturnValue(true) },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: vi.fn().mockReturnValue(true) },
        },
        {
          provide: PoliciesGuard,
          useValue: { canActivate: vi.fn().mockReturnValue(true) },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: vi.fn().mockReturnValue(true) })
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
