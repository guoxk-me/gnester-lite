// CN: 测试文件，验证 authorization common 的行为契约；EN: Test file verifies behavior contracts for authorization common.
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

// CN: 准备或验证 authorization common 的 create http context 测试逻辑；EN: Prepares or verifies the create http context test logic for authorization common.
function createHttpContext(user?: unknown): ExecutionContext {
  // CN: 准备或验证 authorization common 的 handler 测试逻辑；EN: Prepares or verifies the handler test logic for authorization common.
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

// CN: 准备或验证 authorization common 的 create guard 测试逻辑；EN: Prepares or verifies the create guard test logic for authorization common.
function createGuard(
  requiredPermissions?: readonly string[],
): PermissionsGuard {
  return new PermissionsGuard({
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector);
}

// CN: 测试分组：PermissionsGuard；EN: Test group: PermissionsGuard.
describe('PermissionsGuard', () => {
  // CN: 测试用例：allows routes without permission metadata；EN: Test case: allows routes without permission metadata.
  it('allows routes without permission metadata', () => {
    const guard = createGuard();

    expect(guard.canActivate(createHttpContext())).toBe(true);
  });

  // CN: 测试用例：allows authenticated users with every required permission；EN: Test case: allows authenticated users with every required permission.
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

  // CN: 测试用例：rejects authenticated users missing any required permission；EN: Test case: rejects authenticated users missing any required permission.
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

  // CN: 测试用例：looks up permission metadata from handler before controller；EN: Test case: looks up permission metadata from handler before controller.
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
