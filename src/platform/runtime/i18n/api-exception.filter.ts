import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

import {
  type ApiEnvelope,
  type ApiValidationErrorDetail,
} from '../../../contracts/api-envelope';
import { httpStatusMessageKey, translateKey } from './i18n.translate';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readValidationErrors(
  value: unknown,
): readonly ApiValidationErrorDetail[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const details = value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    if (typeof item.field !== 'string' || typeof item.reason !== 'string') {
      return [];
    }

    return [
      {
        field: item.field,
        reason: item.reason,
      } satisfies ApiValidationErrorDetail,
    ];
  });

  return details.length > 0 ? details : null;
}

function resolveExceptionMessage(
  statusCode: number,
  responseBody: string | Record<string, unknown>,
): string {
  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    // AI modified: treat dotted keys as i18n catalog entries when services throw message keys.
    if (responseBody.includes('.')) {
      return translateKey(responseBody, {
        defaultValue: responseBody,
      });
    }

    return responseBody;
  }

  if (isRecord(responseBody) && typeof responseBody.message === 'string') {
    const message = responseBody.message;

    if (message.includes('.')) {
      return translateKey(message, { defaultValue: message });
    }

    if (message === 'Validation failed') {
      return translateKey('errors.VALIDATION_FAILED', {
        defaultValue: message,
      });
    }

    return message;
  }

  return translateKey(httpStatusMessageKey(statusCode), {
    defaultValue: HttpStatus[statusCode] ?? 'Error',
  });
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      // AI modified: keep unexpected failures visible to Sentry after owning the response body.
      Sentry.captureException(exception);
    }

    const rawBody =
      exception instanceof HttpException ? exception.getResponse() : null;
    const responseBody =
      typeof rawBody === 'string' || isRecord(rawBody)
        ? rawBody
        : {
            message: translateKey('errors.INTERNAL_SERVER_ERROR', {
              defaultValue: 'Internal server error',
            }),
          };

    const errors = isRecord(responseBody)
      ? readValidationErrors(responseBody.errors)
      : null;

    const envelope: ApiEnvelope = {
      code:
        isRecord(responseBody) && typeof responseBody.code === 'number'
          ? responseBody.code
          : statusCode,
      message: resolveExceptionMessage(statusCode, responseBody),
      data: null,
      errors,
    };

    if (!response.headersSent) {
      httpAdapter.reply(response, envelope, statusCode);
      return;
    }

    // Headers already sent (for example by Express CSRF middleware): avoid double write.
    void request;
  }
}
