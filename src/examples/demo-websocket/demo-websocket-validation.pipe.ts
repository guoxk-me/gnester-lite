import {
  ValidationPipe,
  type ValidationError,
  type ValidationPipeOptions,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

interface DemoWebsocketValidationErrorDetail {
  readonly field: string;
  readonly reason: string;
}

export function createDemoWebsocketValidationPipe(
  options: ValidationPipeOptions = {},
): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: (errors) =>
      new WsException({
        code: 'WEBSOCKET_VALIDATION_FAILED',
        message: 'Validation failed',
        errors: collectWebsocketValidationErrors(errors),
      }),
    ...options,
  });
}

function collectWebsocketValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): DemoWebsocketValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const currentErrors = Object.values(error.constraints ?? {}).map(
      (reason) => ({
        field: fieldPath,
        reason,
      }),
    );
    const childErrors = collectWebsocketValidationErrors(
      error.children ?? [],
      fieldPath,
    );

    return [...currentErrors, ...childErrors];
  });
}
