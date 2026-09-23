import type { RequestHandler } from 'express';
import type { I18nService } from 'nestjs-i18n';

import {
  BETTER_AUTH_CLIENT_IP_HEADER,
  isBetterAuthRequestPath,
} from 'config/better-auth.config';
import type { BetterAuthRequestHandler } from '../../platform/security/better-auth/better-auth.service';
import { resolveSupportedLanguage } from '../../platform/runtime/i18n/i18n.translate';

export const BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES = 1_048_576;

export function createBetterAuthRequestMiddleware(
  betterAuthHandler: BetterAuthRequestHandler,
  i18nService: I18nService,
): RequestHandler {
  return (request, response, next) => {
    if (!isBetterAuthRequestPath(request.path)) {
      next();
      return;
    }

    // AI modified: overwrite the private header with Express's trusted-proxy result before Better Auth rate limiting.
    request.headers[BETTER_AUTH_CLIENT_IP_HEADER] = request.ip;

    const forwardRequestToBetterAuth = (): void => {
      void betterAuthHandler(request, response).catch((handlerError: unknown) =>
        next(handlerError),
      );
    };

    if (
      request.method === 'GET' ||
      request.method === 'HEAD' ||
      request.destroyed ||
      request.readableEnded ||
      !request.readable
    ) {
      forwardRequestToBetterAuth();
      return;
    }

    const bodyChunks: Buffer[] = [];
    let bodySize = 0;
    let isOversized = hasOversizedDeclaredBody(
      request.headers['content-length'],
    );
    let hasFinishedReading = false;

    // AI modified: buffer at most 1 MiB of raw auth input so chunked requests cannot bypass the pre-Nest limit.
    request.on('data', (incomingChunk: Buffer | string) => {
      const bodyChunk = Buffer.isBuffer(incomingChunk)
        ? incomingChunk
        : Buffer.from(incomingChunk);
      bodySize += bodyChunk.byteLength;

      if (bodySize > BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES) {
        isOversized = true;
        bodyChunks.length = 0;
        return;
      }

      if (!isOversized) {
        bodyChunks.push(bodyChunk);
      }
    });
    request.once('aborted', () => {
      hasFinishedReading = true;
    });
    request.once('error', (requestError: Error) => {
      if (hasFinishedReading) {
        return;
      }

      hasFinishedReading = true;
      next(requestError);
    });
    request.once('end', () => {
      if (hasFinishedReading) {
        return;
      }

      hasFinishedReading = true;

      if (!isOversized) {
        if (bodySize > 0) {
          // Better Call replays this raw string after observing that the Node stream has ended.
          request.body = Buffer.concat(bodyChunks, bodySize).toString('utf8');
        }

        forwardRequestToBetterAuth();
        return;
      }

      const language = resolveSupportedLanguage(
        request.headers['accept-language'],
      );
      const translatedMessage = i18nService.translate('http.413', {
        lang: language,
        defaultValue: 'Payload Too Large',
      });

      // AI modified: this project-owned pre-Nest failure follows the shared localized envelope contract.
      response.vary('Accept-Language');
      response.setHeader('Content-Language', language);
      response.status(413).json({
        code: 413,
        message:
          typeof translatedMessage === 'string'
            ? translatedMessage
            : 'Payload Too Large',
        data: null,
        errors: null,
      });
    });
    request.resume();
  };
}

function hasOversizedDeclaredBody(contentLength: string | undefined): boolean {
  return (
    contentLength !== undefined &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > BETTER_AUTH_REQUEST_BODY_LIMIT_BYTES
  );
}
