import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { SKIP_HTTP_THROTTLE_KEY } from './skip-http-throttle.decorator';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // AI modified: the stock guard writes HTTP headers and must never handle RPC/WS contexts.
    if (context.getType() !== 'http') {
      return true;
    }

    const shouldSkipAllBudgets =
      this.reflector.getAllAndOverride<boolean>(SKIP_HTTP_THROTTLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (shouldSkipAllBudgets) {
      return true;
    }

    return super.shouldSkip(context);
  }
}
