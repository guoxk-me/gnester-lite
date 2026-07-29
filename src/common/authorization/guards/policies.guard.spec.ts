import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { PoliciesGuard } from './policies.guard';

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

function createGuard(policies?: readonly jest.Mock[]): PoliciesGuard {
  return new PoliciesGuard({
    getAllAndOverride: jest.fn().mockReturnValue(policies),
  } as unknown as Reflector);
}

describe('PoliciesGuard', () => {
  it('allows routes without policy metadata', async () => {
    const guard = createGuard();

    await expect(guard.canActivate(createHttpContext())).resolves.toBe(true);
  });

  it('allows requests when every policy accepts the user and context', async () => {
    const policy = jest.fn().mockReturnValue(true);
    const guard = createGuard([policy]);
    const user = {
      sub: 'demo-user',
      username: 'user@example.com',
    };
    const context = createHttpContext(user);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(policy).toHaveBeenCalledWith(user, context);
  });

  it('rejects requests when any policy rejects the user', async () => {
    const guard = createGuard([
      jest.fn().mockResolvedValue(true),
      jest.fn().mockResolvedValue(false),
    ]);

    await expect(
      guard.canActivate(
        createHttpContext({
          sub: 'demo-user',
          username: 'user@example.com',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('looks up policy metadata from handler before controller', async () => {
    const getAllAndOverride = jest
      .fn()
      .mockReturnValue([jest.fn().mockReturnValue(true)]);
    const guard = new PoliciesGuard({
      getAllAndOverride,
    } as unknown as Reflector);
    const context = createHttpContext({
      sub: 'demo-user',
      username: 'user@example.com',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(CHECK_POLICIES_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
