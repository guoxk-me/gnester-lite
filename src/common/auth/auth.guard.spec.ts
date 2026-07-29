import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthGuard } from './auth.guard';
import type { AuthTokenService } from './auth-token.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

describe('AuthGuard', () => {
  function createHttpContext(authorization?: string): ExecutionContext {
    const request = {
      headers: authorization ? { authorization } : {},
    } as Record<string, unknown>;
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

  it('allows routes marked public without requiring a bearer token', async () => {
    const verifyAccessToken = jest.fn();
    const getAllAndOverride = jest.fn().mockReturnValue(true);
    const authTokenService = {
      verifyAccessToken,
    } as unknown as AuthTokenService;
    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;
    const guard = new AuthGuard(authTokenService, reflector);

    await expect(guard.canActivate(createHttpContext())).resolves.toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects protected routes without a bearer token', async () => {
    const guard = new AuthGuard(
      { verifyAccessToken: jest.fn() } as unknown as AuthTokenService,
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector,
    );

    await expect(guard.canActivate(createHttpContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches verified token payload to the request user', async () => {
    const payload = { sub: 'user_1', username: 'demo' };
    const verifyAccessToken = jest.fn().mockResolvedValue(payload);
    const authTokenService = {
      verifyAccessToken,
    } as unknown as AuthTokenService;
    const guard = new AuthGuard(authTokenService, {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector);
    const context = createHttpContext('Bearer token_123');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    expect(verifyAccessToken).toHaveBeenCalledWith('token_123');
    expect(request.user).toEqual(payload);
  });

  it('accepts a case-insensitive bearer scheme and rejects extra segments', async () => {
    const verifyAccessToken = jest.fn().mockResolvedValue({
      sub: 'user_1',
      username: 'demo',
    });
    const guard = new AuthGuard(
      { verifyAccessToken } as unknown as AuthTokenService,
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector,
    );

    await expect(
      guard.canActivate(createHttpContext('bearer token_123')),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createHttpContext('Bearer token_123 trailing')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAccessToken).toHaveBeenCalledTimes(1);
  });
});
