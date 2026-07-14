// CN: 过滤器，统一处理 demo-websocket 的异常；EN: Filter handles exceptions for demo-websocket.
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
} from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

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
  // CN: 捕获并格式化 demo-websocket 的 catch 异常；EN: Catches and formats catch exceptions for demo-websocket.
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<DemoWebsocketSocket>();

    client.emit('demo-websocket.exception', this.toPayload(exception));
  }

  // CN: 捕获并格式化 demo-websocket 的 to payload 异常；EN: Catches and formats to payload exceptions for demo-websocket.
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
      return normalizeWsExceptionError(exception.getError());
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

// CN: 捕获并格式化 demo-websocket 的 normalize ws exception error 异常；EN: Catches and formats normalize ws exception error exceptions for demo-websocket.
function normalizeWsExceptionError(
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

// CN: 捕获并格式化 demo-websocket 的 is validation error details 异常；EN: Catches and formats is validation error details exceptions for demo-websocket.
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

// CN: 捕获并格式化 demo-websocket 的 is record 异常；EN: Catches and formats is record exceptions for demo-websocket.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
