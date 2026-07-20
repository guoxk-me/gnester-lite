// CN: 测试文件，验证 authorization common 的行为契约；EN: Test file verifies behavior contracts for authorization common.
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { PoliciesGuard } from './policies.guard';

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
function createGuard(policies?: readonly jest.Mock[]): PoliciesGuard {
  return new PoliciesGuard({
    getAllAndOverride: jest.fn().mockReturnValue(policies),
  } as unknown as Reflector);
}

// CN: 测试分组：PoliciesGuard；EN: Test group: PoliciesGuard.
describe('PoliciesGuard', () => {
  // CN: 测试用例：allows routes without policy metadata；EN: Test case: allows routes without policy metadata.
  it('allows routes without policy metadata', async () => {
    const guard = createGuard();

    await expect(guard.canActivate(createHttpContext())).resolves.toBe(true);
  });

  // CN: 测试用例：allows requests when every policy accepts the user and context；EN: Test case: allows requests when every policy accepts the user and context.
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

  // CN: 测试用例：rejects requests when any policy rejects the user；EN: Test case: rejects requests when any policy rejects the user.
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

  // CN: 测试用例：looks up policy metadata from handler before controller；EN: Test case: looks up policy metadata from handler before controller.
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
