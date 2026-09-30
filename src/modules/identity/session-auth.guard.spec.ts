import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { ApplicationAuthService } from './application-auth.service.js';
import type { UserManagementService } from './user-management.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { IdentityAdminGuard } from './identity-admin.guard.js';
import type { SessionRequest } from './session-request.types.js';

// AI modified: HTTP guard extraction must propagate revocation and current-role failures before business work.
describe('application identity HTTP guards', () => {
  const requireUser = vi.fn();
  const requireAdminUser = vi.fn();
  const request = {} as SessionRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const session = new SessionAuthGuard({
    requireUser,
  } as unknown as ApplicationAuthService);
  const admin = new IdentityAdminGuard({
    requireAdminUser,
  } as unknown as UserManagementService);
  beforeEach(() => vi.resetAllMocks());

  it('exposes the live session identity and checks the current administrator by its id', async () => {
    const user = {
      id: 'account',
      name: 'Account',
      email: 'account@example.test',
      image: null,
    };
    requireUser.mockResolvedValue(user);
    requireAdminUser.mockResolvedValue(user.id);
    expect(await session.canActivate(context)).toBe(true);
    expect(request.sessionUser).toBe(user);
    expect(await admin.canActivate(context)).toBe(true);
    expect(requireAdminUser).toHaveBeenCalledWith('account');
  });

  it('propagates expired sessions and revoked administrator roles', async () => {
    requireUser.mockRejectedValue(new UnauthorizedException());
    await expect(session.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    request.sessionUser = {
      id: 'account',
      name: 'Account',
      email: 'account@example.test',
      image: null,
    };
    requireAdminUser.mockRejectedValue(new ForbiddenException());
    await expect(admin.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
