// CN: 管道，转换或校验 validation common 的输入；EN: Pipe transforms or validates input for validation common.
import {
  BadRequestException,
  type ValidationError,
  ValidationPipe,
  type ValidationPipeOptions,
} from '@nestjs/common';

import { Environment } from 'config/config.types';

export interface ValidationErrorDetail {
  readonly field: string;
  readonly reason: string;
}

// CN: 校验或转换 validation common 的 collect validation errors 输入；EN: Validates or transforms collect validation errors input for validation common.
function collectValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
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
    const childErrors = collectValidationErrors(
      error.children ?? [],
      fieldPath,
    );

    return [...currentErrors, ...childErrors];
  });
}

// CN: 校验或转换 validation common 的 validation exception factory 输入；EN: Validates or transforms validation exception factory input for validation common.
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const details = collectValidationErrors(errors);

  return new BadRequestException({
    code: 400,
    message: 'Validation failed',
    errors: details.length > 0 ? details : undefined,
  });
}

// CN: 校验或转换 validation common 的 create validation pipe 输入；EN: Validates or transforms create validation pipe input for validation common.
export function createValidationPipe(
  nodeEnv: Environment,
  options: ValidationPipeOptions = {},
): ValidationPipe {
  return new ValidationPipe({
    disableErrorMessages: nodeEnv === Environment.Production,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: validationExceptionFactory,
    ...options,
  });
}
