import type { Provider } from '@nestjs/common';

import {
  BetterAuthService,
  type BetterAuthRequestHandler,
} from '../src/platform/security/better-auth/better-auth.service';

const betterAuthHandler: BetterAuthRequestHandler = (
  _incomingRequest,
  serverResponse,
) => {
  serverResponse.statusCode = 404;
  serverResponse.end();
  return Promise.resolve();
};

// AI modified: focused e2e slices keep the shared raw-body bootstrap without opening a real auth database pool.
export const betterAuthTestProvider: Provider = {
  provide: BetterAuthService,
  useValue: {
    getRequestHandler: () => Promise.resolve(betterAuthHandler),
  },
};
