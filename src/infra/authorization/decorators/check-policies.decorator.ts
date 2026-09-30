import { SetMetadata } from '@nestjs/common';

import type { PolicyHandler } from '../policy.types.js';

export const CHECK_POLICIES_KEY = 'checkPolicies';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
