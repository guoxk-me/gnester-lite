import {
  type CanActivate,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { I18nContext } from 'nestjs-i18n';
import { isObservable, map, type Observable } from 'rxjs';
import type { Response } from 'express';

import {
  type ApiEnvelope,
  isApiEnvelope,
} from '../../../contracts/api-envelope';
import {
  I18N_FALLBACK_LANGUAGE,
  SKIP_API_ENVELOPE_KEY,
} from './i18n.constants';
import { httpStatusMessageKey, translateKey } from './i18n.translate';

function isNativeResponseBoundary(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  const isSkipped = reflector.getAllAndOverride<boolean>(
    SKIP_API_ENVELOPE_KEY,
    [context.getHandler(), context.getClass()],
  );
  const isSse = reflector.getAllAndOverride<boolean>(SSE_METADATA, [
    context.getHandler(),
  ]);

  return isSkipped === true || isSse === true;
}

@Injectable()
export class ApiEnvelopeBoundaryGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      context.getType() === 'http' &&
      isNativeResponseBoundary(this.reflector, context)
    ) {
      const response = context.switchToHttp().getResponse<Response>();

      // AI modified: mark native routes before controller guards can throw and bypass the interceptor.
      response.locals[SKIP_API_ENVELOPE_KEY] = true;
    }

    return true;
  }
}

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    if (isNativeResponseBoundary(this.reflector, context)) {
      const response = context.switchToHttp().getResponse<Response>();

      // AI modified: carry native route boundaries into the filter and bypass SSE before mapping emitted events.
      response.locals[SKIP_API_ENVELOPE_KEY] = true;
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown): unknown => {
        if (this.shouldBypass(payload)) {
          return payload;
        }

        const response = context.switchToHttp().getResponse<Response>();
        const code = response.statusCode;
        const language = I18nContext.current()?.lang ?? I18N_FALLBACK_LANGUAGE;

        // AI modified: declare the negotiated representation so shared caches do not mix languages.
        response.vary('Accept-Language');
        response.setHeader('Content-Language', language);
        const localizedSuccess = translateKey('common.OK', {
          defaultValue: 'Success',
        });
        const message = translateKey(httpStatusMessageKey(code), {
          // AI modified: uncommon successful statuses still receive a localized fallback.
          defaultValue: code >= 200 && code < 300 ? localizedSuccess : 'Error',
        });

        const envelope: ApiEnvelope = {
          code,
          message,
          data: payload === undefined ? null : payload,
          errors: null,
        };

        return envelope;
      }),
    );
  }

  private shouldBypass(payload: unknown): boolean {
    if (payload instanceof StreamableFile) {
      return true;
    }

    if (isObservable(payload)) {
      return true;
    }

    if (isApiEnvelope(payload)) {
      return true;
    }

    return false;
  }
}
