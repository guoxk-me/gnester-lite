import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

function createHttpContext(user?: unknown): ExecutionContext {
  const handler = () => undefined;
  class Controller {}

  return {
    getHandler: jest.fn().mockReturnValue(handler),
    getClass: jest.fn().mockReturnValue(Controller),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(
  requiredPermissions?: readonly string[],
): PermissionsGuard {
  return new PermissionsGuard({
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector);
}

describe('PermissionsGuard', () => {
  it('allows routes without permission metadata', () => {
    const guard = createGuard();

    expect(guard.canActivate(createHttpContext())).toBe(true);
  });

  it('allows authenticated users with every required permission', () => {
    const guard = createGuard(['audit:read', 'audit:export']);

    expect(
      guard.canActivate(
        createHttpContext({
          sub: 'demo-admin',
          username: 'admin@example.com',
          permissions: ['audit:read', 'audit:export', 'demo:read'],
        }),
      ),
    ).toBe(true);
  });

  it('rejects authenticated users missing any required permission', () => {
    const guard = createGuard(['audit:read', 'audit:export']);

    expect(() =>
      guard.canActivate(
        createHttpContext({
          sub: 'demo-user',
          username: 'user@example.com',
          permissions: ['audit:read'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('looks up permission metadata from handler before controller', () => {
    const getAllAndOverride = jest.fn().mockReturnValue(['audit:read']);
    const guard = new PermissionsGuard({
      getAllAndOverride,
    } as unknown as Reflector);
    const context = createHttpContext({
      sub: 'demo-admin',
      username: 'admin@example.com',
      permissions: ['audit:read'],
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
