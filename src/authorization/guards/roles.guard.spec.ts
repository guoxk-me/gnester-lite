import {
  ExecutionContext,
  ForbiddenException,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

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

function createGuard(requiredRoles?: readonly string[]): RolesGuard {
  return new RolesGuard({
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector);
}

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const guard = createGuard();

    expect(guard.canActivate(createHttpContext())).toBe(true);
  });

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
