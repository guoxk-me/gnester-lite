import type { RequestHandler } from 'express';

import {
  BETTER_AUTH_CLIENT_IP_HEADER,
  isBetterAuthRequestPath,
} from 'config/better-auth.config';
import type { BetterAuthRequestHandler } from '../../platform/security/better-auth/better-auth.service';

export const BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES = 1_048_576;

export function createBetterAuthRequestMiddleware(
  betterAuthHandler: BetterAuthRequestHandler,
): RequestHandler {
  return (request, response, next) => {
    if (!isBetterAuthRequestPath(request.path)) {
      next();
      return;
    }

    // AI modified: overwrite the private header with Express's trusted-proxy result before Better Auth rate limiting.
    request.headers[BETTER_AUTH_CLIENT_IP_HEADER] = request.ip;

    // AI modified: reject declared oversized payloads without consuming the raw stream Better Auth must read itself.
    if (hasOversizedDeclaredBody(request.headers['content-length'])) {
      response.status(413).json({
        statusCode: 413,
        code: 'BETTER_AUTH_BODY_TOO_LARGE',
        message: 'Better Auth request body exceeds the 1 MiB limit.',
      });
      return;
    }

    void betterAuthHandler(request, response).catch((handlerError: unknown) =>
      next(handlerError),
    );
  };
}

function hasOversizedDeclaredBody(contentLength: string | undefined): boolean {
  return (
    contentLength !== undefined &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES
  );
}
