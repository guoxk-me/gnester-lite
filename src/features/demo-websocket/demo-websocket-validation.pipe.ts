// CN: 管道，转换或校验 demo-websocket 的输入；EN: Pipe transforms or validates input for demo-websocket.
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

// CN: 校验或转换 demo-websocket 的 create demo websocket validation pipe 输入；EN: Validates or transforms create demo websocket validation pipe input for demo-websocket.
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

// CN: 校验或转换 demo-websocket 的 collect websocket validation errors 输入；EN: Validates or transforms collect websocket validation errors input for demo-websocket.
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
