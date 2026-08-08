import {
  BadRequestException,
  type ValidationError,
  ValidationPipe,
  type ValidationPipeOptions,
} from '@nestjs/common';

import { translateKey } from '../../platform/runtime/i18n/i18n.translate';

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
    const currentErrors = Object.entries(error.constraints ?? {}).map(
      ([constraint, fallback]) => ({
        field: fieldPath,
        // AI modified: translate by constraint name when i18n context is present.
        reason: translateKey(`validation.${constraint}`, {
          args: { property: error.property },
          defaultValue: fallback,
        }),
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
    message: translateKey('errors.VALIDATION_FAILED', {
      defaultValue: 'Validation failed',
    }),
    data: null,
    errors: details.length > 0 ? details : null,
  });
}

export function createValidationPipe(
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
    exceptionFactory: validationExceptionFactory,
    ...options,
  });
}
