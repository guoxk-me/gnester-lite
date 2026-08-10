import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

import {
  type ApiEnvelope,
  type ApiValidationErrorDetail,
} from '../../../contracts/api-envelope';
import {
  I18N_FALLBACK_LANGUAGE,
  SKIP_API_ENVELOPE_KEY,
} from './i18n.constants';
import {
  httpStatusMessageKey,
  resolveSupportedLanguage,
} from './i18n.translate';

interface ExceptionTranslationOptions {
  readonly args?: Record<string, unknown>;
  readonly defaultValue: string;
}

type ExceptionTranslator = (
  key: string,
  options: ExceptionTranslationOptions,
) => string;

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate)
  );
}

function isHttpStatus(statusCandidate: unknown): statusCandidate is number {
  return (
    typeof statusCandidate === 'number' &&
    Number.isInteger(statusCandidate) &&
    statusCandidate >= Number(HttpStatus.BAD_REQUEST) &&
    statusCandidate < 600
  );
}

function readHttpStatus(exception: unknown): number | null {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();

    return isHttpStatus(statusCode) ? statusCode : null;
  }

  if (!isRecord(exception)) {
    return null;
  }

  // AI modified: Express adapters throw http-errors objects instead of Nest HttpException instances.
  if (isHttpStatus(exception.statusCode)) {
    return exception.statusCode;
  }

  return isHttpStatus(exception.status) ? exception.status : null;
}

function readValidationErrors(
  validationDetailsCandidate: unknown,
): readonly ApiValidationErrorDetail[] | null {
  if (!Array.isArray(validationDetailsCandidate)) {
    return null;
  }

  const details = validationDetailsCandidate.flatMap(
    (validationDetailCandidate) => {
      if (!isRecord(validationDetailCandidate)) {
        return [];
      }

      if (
        typeof validationDetailCandidate.field !== 'string' ||
        typeof validationDetailCandidate.reason !== 'string'
      ) {
        return [];
      }

      return [
        {
          field: validationDetailCandidate.field,
          reason: validationDetailCandidate.reason,
        } satisfies ApiValidationErrorDetail,
      ];
    },
  );

  return details.length > 0 ? details : null;
}

function defaultHttpMessage(statusCode: number): string | null {
  const statusName = HttpStatus[statusCode];

  if (typeof statusName !== 'string') {
    return null;
  }

  return statusName
    .split('_')
    .map(
      (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(' ');
}

function isDefaultHttpExceptionBody(
  statusCode: number,
  responseBody: Record<string, unknown>,
): boolean {
  return (
    responseBody.statusCode === statusCode &&
    responseBody.message === defaultHttpMessage(statusCode) &&
    !('error' in responseBody)
  );
}

function isRouterNotFoundBody(
  statusCode: number,
  responseBody: Record<string, unknown>,
): boolean {
  return (
    statusCode === Number(HttpStatus.NOT_FOUND) &&
    responseBody.error === defaultHttpMessage(statusCode) &&
    typeof responseBody.message === 'string' &&
    /^Cannot [A-Z-]+ \//.test(responseBody.message)
  );
}

function localizedHttpStatusMessage(
  statusCode: number,
  language: string,
  translateExceptionKey: ExceptionTranslator,
): string {
  const defaultMessage = defaultHttpMessage(statusCode) ?? 'Error';

  if (language === I18N_FALLBACK_LANGUAGE) {
    return translateExceptionKey(httpStatusMessageKey(statusCode), {
      defaultValue: defaultMessage,
    });
  }

  const genericStatus =
    statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
      ? Number(HttpStatus.INTERNAL_SERVER_ERROR)
      : Number(HttpStatus.BAD_REQUEST);
  const localizedGenericMessage = translateExceptionKey(
    httpStatusMessageKey(genericStatus),
    {
      defaultValue: defaultHttpMessage(genericStatus) ?? 'Error',
    },
  );

  // AI modified: an incomplete status catalog degrades to a localized category, never an English literal.
  return translateExceptionKey(httpStatusMessageKey(statusCode), {
    defaultValue: localizedGenericMessage,
  });
}

function resolveExceptionMessage(
  statusCode: number,
  responseBody: string | Record<string, unknown>,
  language: string,
  translateExceptionKey: ExceptionTranslator,
): string {
  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    // AI modified: only the established errors.* namespace is a legacy message-key contract.
    if (responseBody.startsWith('errors.')) {
      return translateExceptionKey(responseBody, {
        defaultValue: localizedHttpStatusMessage(
          statusCode,
          language,
          translateExceptionKey,
        ),
      });
    }

    // AI modified: uncatalogued English literals keep detail for English but never leak into localized responses.
    return language === I18N_FALLBACK_LANGUAGE
      ? responseBody
      : localizedHttpStatusMessage(statusCode, language, translateExceptionKey);
  }

  if (
    isRecord(responseBody) &&
    (isDefaultHttpExceptionBody(statusCode, responseBody) ||
      isRouterNotFoundBody(statusCode, responseBody))
  ) {
    // AI modified: framework-generated messages follow status catalogs and never expose request paths.
    return localizedHttpStatusMessage(
      statusCode,
      language,
      translateExceptionKey,
    );
  }

  if (isRecord(responseBody) && typeof responseBody.messageKey === 'string') {
    const messageArgs = isRecord(responseBody.messageArgs)
      ? responseBody.messageArgs
      : undefined;

    // AI modified: localized business errors declare messageKey/messageArgs explicitly.
    return translateExceptionKey(responseBody.messageKey, {
      args: messageArgs,
      defaultValue: localizedHttpStatusMessage(
        statusCode,
        language,
        translateExceptionKey,
      ),
    });
  }

  if (isRecord(responseBody) && typeof responseBody.message === 'string') {
    const message = responseBody.message;

    if (message.startsWith('errors.')) {
      return translateExceptionKey(message, {
        defaultValue: localizedHttpStatusMessage(
          statusCode,
          language,
          translateExceptionKey,
        ),
      });
    }

    if (
      message === 'Validation failed' ||
      readValidationErrors(responseBody.errors) !== null
    ) {
      return translateExceptionKey('errors.VALIDATION_FAILED', {
        defaultValue: message,
      });
    }

    return language === I18N_FALLBACK_LANGUAGE
      ? message
      : localizedHttpStatusMessage(statusCode, language, translateExceptionKey);
  }

  return localizedHttpStatusMessage(
    statusCode,
    language,
    translateExceptionKey,
  );
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly i18nService: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // AI modified: an HTTP-only filter must not consume RPC or WebSocket failures.
      throw exception;
    }

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const language = resolveSupportedLanguage(
      request.headers['accept-language'],
    );
    const translateExceptionKey: ExceptionTranslator = (key, options) =>
      this.translateExceptionKey(key, language, options);

    const recognizedStatus = readHttpStatus(exception);
    const statusCode = recognizedStatus ?? HttpStatus.INTERNAL_SERVER_ERROR;

    if (recognizedStatus === null) {
      // AI modified: unexpected failures remain visible without leaking their cause to clients.
      Sentry.captureException(exception);
      this.logger.error(exception);
    }

    const rawBody =
      recognizedStatus !== null && exception instanceof HttpException
        ? exception.getResponse()
        : null;
    const responseBody =
      typeof rawBody === 'string' || isRecord(rawBody) ? rawBody : {};

    if (response.locals[SKIP_API_ENVELOPE_KEY] === true) {
      // AI modified: skipped routes keep their native error contract, including Terminus probes.
      if (!response.headersSent) {
        const nativeResponseBody =
          typeof rawBody === 'string' || isRecord(rawBody)
            ? rawBody
            : {
                statusCode,
                message: resolveExceptionMessage(
                  statusCode,
                  responseBody,
                  language,
                  translateExceptionKey,
                ),
              };
        httpAdapter.reply(response, nativeResponseBody, statusCode);
      }

      return;
    }

    const errors = isRecord(responseBody)
      ? readValidationErrors(responseBody.errors)
      : null;

    const envelope: ApiEnvelope = {
      // AI modified: envelope code is the wire HTTP status, never an untrusted response-body override.
      code: statusCode,
      message: resolveExceptionMessage(
        statusCode,
        responseBody,
        language,
        translateExceptionKey,
      ),
      data: null,
      errors,
    };

    if (!response.headersSent) {
      // AI modified: error envelopes declare their negotiated representation for shared caches.
      response.vary('Accept-Language');
      response.setHeader('Content-Language', language);
      httpAdapter.reply(response, envelope, statusCode);
      return;
    }

    // Headers already sent (for example by Express CSRF middleware): avoid double write.
    void request;
  }

  private translateExceptionKey(
    key: string,
    language: string,
    options: ExceptionTranslationOptions,
  ): string {
    const translated = this.i18nService.translate(key, {
      lang: language,
      args: options.args,
      defaultValue: options.defaultValue,
    });

    return typeof translated === 'string' ? translated : String(translated);
  }
}
