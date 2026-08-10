import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import * as Sentry from '@sentry/nestjs';

import { DEMO_WEBSOCKET_EVENTS } from './demo-websocket.constants';
import type { DemoWebsocketSocket } from './demo-websocket.gateway';

interface DemoWebsocketErrorDetail {
  readonly field: string;
  readonly reason: string;
}

interface DemoWebsocketExceptionPayload {
  readonly code: string;
  readonly message: string;
  readonly errors?: DemoWebsocketErrorDetail[];
}

@Catch()
export class DemoWebsocketExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // AI modified: APP_FILTER does not cover gateways, so report unexpected WS errors here.
    if (shouldCaptureWebsocketException(exception)) {
      Sentry.captureException(exception);
    }

    const client = host.switchToWs().getClient<DemoWebsocketSocket>();

    client.emit(DEMO_WEBSOCKET_EVENTS.Exception, this.toPayload(exception));
  }

  private toPayload(exception: unknown): DemoWebsocketExceptionPayload {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();

      if (isRecord(response) && response.message === 'Validation failed') {
        return {
          code: 'WEBSOCKET_VALIDATION_FAILED',
          message: 'Validation failed',
          ...(isValidationErrorDetails(response.errors)
            ? { errors: response.errors }
            : {}),
        };
      }
    }

    if (exception instanceof WsException) {
      return websocketErrorPayload(exception.getError());
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (isRecord(response)) {
        return {
          code:
            typeof response.code === 'string'
              ? response.code
              : 'WEBSOCKET_ERROR',
          message:
            typeof response.message === 'string'
              ? response.message
              : 'Websocket error',
        };
      }

      return {
        code: 'WEBSOCKET_ERROR',
        message: exception.message,
      };
    }

    return {
      code: 'WEBSOCKET_INTERNAL_ERROR',
      message: 'Internal websocket error',
    };
  }
}

// AI modified: skip expected control-flow exceptions; report unexpected failures only.
function shouldCaptureWebsocketException(exception: unknown): boolean {
  return !(
    exception instanceof BadRequestException ||
    exception instanceof WsException ||
    exception instanceof HttpException
  );
}

function websocketErrorPayload(
  error: string | object,
): DemoWebsocketExceptionPayload {
  if (typeof error === 'string') {
    return {
      code: 'WEBSOCKET_EXCEPTION',
      message: error,
    };
  }

  if (isRecord(error)) {
    return {
      code: typeof error.code === 'string' ? error.code : 'WEBSOCKET_EXCEPTION',
      message:
        typeof error.message === 'string'
          ? error.message
          : 'Websocket exception',
      ...(isValidationErrorDetails(error.errors)
        ? { errors: error.errors }
        : {}),
    };
  }

  return {
    code: 'WEBSOCKET_EXCEPTION',
    message: 'Websocket exception',
  };
}

function isValidationErrorDetails(
  value: unknown,
): value is DemoWebsocketErrorDetail[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.field === 'string' &&
        typeof item.reason === 'string',
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
