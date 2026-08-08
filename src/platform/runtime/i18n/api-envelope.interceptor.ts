import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isObservable, map, type Observable } from 'rxjs';
import type { Response } from 'express';

import {
  type ApiEnvelope,
  isApiEnvelope,
} from '../../../contracts/api-envelope';
import { SKIP_API_ENVELOPE_KEY } from './i18n.constants';
import { httpStatusMessageKey, translateKey } from './i18n.translate';

@Injectable()
export class ApiEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_API_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSkipped) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown): unknown => {
        if (this.shouldBypass(payload)) {
          return payload;
        }

        const response = context.switchToHttp().getResponse<Response>();
        const code = response.statusCode;
        const message = translateKey(httpStatusMessageKey(code), {
          defaultValue: code >= 200 && code < 300 ? 'Success' : 'Error',
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
