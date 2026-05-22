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
