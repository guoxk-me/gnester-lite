// CN: 测试文件，验证 auth common 的行为契约；EN: Test file verifies behavior contracts for auth common.
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

// CN: 测试分组：AuthGuard；EN: Test group: AuthGuard.
describe('AuthGuard', () => {
  // CN: 准备或验证 auth common 的 create http context 测试逻辑；EN: Prepares or verifies the create http context test logic for auth common.
  function createHttpContext(authorization?: string): ExecutionContext {
    const request = {
      headers: authorization ? { authorization } : {},
    } as Record<string, unknown>;
    // CN: 准备或验证 auth common 的 handler 测试逻辑；EN: Prepares or verifies the handler test logic for auth common.
    const handler = () => undefined;
    class Controller {}

    return {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(Controller),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  // CN: 测试用例：allows routes marked public without requiring a bearer token；EN: Test case: allows routes marked public without requiring a bearer token.
  it('allows routes marked public without requiring a bearer token', async () => {
    const verifyAsync = jest.fn();
    const getAllAndOverride = jest.fn().mockReturnValue(true);
    const jwtService = {
      verifyAsync,
    } as unknown as JwtService;
    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;
    const guard = new AuthGuard(jwtService, reflector);

    await expect(guard.canActivate(createHttpContext())).resolves.toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  // CN: 测试用例：rejects protected routes without a bearer token；EN: Test case: rejects protected routes without a bearer token.
  it('rejects protected routes without a bearer token', async () => {
    const guard = new AuthGuard(
      { verifyAsync: jest.fn() } as unknown as JwtService,
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector,
    );

    await expect(guard.canActivate(createHttpContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  // CN: 测试用例：attaches verified token payload to the request user；EN: Test case: attaches verified token payload to the request user.
  it('attaches verified token payload to the request user', async () => {
    const payload = { sub: 'user_1', username: 'demo' };
    const verifyAsync = jest.fn().mockResolvedValue(payload);
    const jwtService = {
      verifyAsync,
    } as unknown as JwtService;
    const guard = new AuthGuard(jwtService, {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector);
    const context = createHttpContext('Bearer token_123');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    expect(verifyAsync).toHaveBeenCalledWith('token_123');
    expect(request.user).toEqual(payload);
  });
});
