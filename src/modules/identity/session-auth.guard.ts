import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { ApplicationAuthService } from './application-auth.service.js';
import type { SessionRequest } from './session-request.types.js';

// AI modified: HTTP authentication runs before business services and preserves live session/account checks.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: ApplicationAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    request.sessionUser = await this.sessions.requireUser(request);
    return true;
  }
}
