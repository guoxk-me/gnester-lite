import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { UserManagementService } from './user-management.service.js';
import type { SessionRequest } from './session-request.types.js';

// AI modified: admin authorization stays with identity instead of leaking Express requests into business services.
@Injectable()
export class IdentityAdminGuard implements CanActivate {
  constructor(private readonly accounts: UserManagementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    await this.accounts.requireAdminUser(request.sessionUser.id);
    return true;
  }
}
