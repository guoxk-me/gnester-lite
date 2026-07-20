// CN: 测试文件，验证 authorization common 的行为契约；EN: Test file verifies behavior contracts for authorization common.
import {
  ExecutionContext,
  ForbiddenException,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

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
function createGuard(requiredRoles?: readonly string[]): RolesGuard {
  return new RolesGuard({
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector);
}

// CN: 测试分组：RolesGuard；EN: Test group: RolesGuard.
describe('RolesGuard', () => {
  // CN: 测试用例：allows routes without role metadata；EN: Test case: allows routes without role metadata.
  it('allows routes without role metadata', () => {
    const guard = createGuard();

    expect(guard.canActivate(createHttpContext())).toBe(true);
  });

  // CN: 测试用例：allows authenticated users with one of the required roles；EN: Test case: allows authenticated users with one of the required roles.
  it('allows authenticated users with one of the required roles', () => {
    const guard = createGuard(['admin', 'operator']);

    expect(
      guard.canActivate(
        createHttpContext({
          sub: 'demo-admin',
          username: 'admin@example.com',
          roles: ['admin'],
        }),
      ),
    ).toBe(true);
  });

  // CN: 测试用例：rejects authenticated users without a required role；EN: Test case: rejects authenticated users without a required role.
  it('rejects authenticated users without a required role', () => {
    const guard = createGuard(['admin']);

    expect(() =>
      guard.canActivate(
        createHttpContext({
          sub: 'demo-user',
          username: 'user@example.com',
          roles: ['user'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  // CN: 测试用例：looks up role metadata from handler before controller；EN: Test case: looks up role metadata from handler before controller.
  it('looks up role metadata from handler before controller', () => {
    const getAllAndOverride = jest.fn().mockReturnValue(['admin']);
    const guard = new RolesGuard({
      getAllAndOverride,
    } as unknown as Reflector);
    const context = createHttpContext({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.any(Function),
      expect.any(Function) as unknown as Type<unknown>,
    ]);
  });
});
