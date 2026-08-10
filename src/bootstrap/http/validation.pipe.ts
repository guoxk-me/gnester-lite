import {
  BadRequestException,
  type ValidationError,
  ValidationPipe,
  type ValidationPipeOptions,
} from '@nestjs/common';

import {
  translateKey,
  type ValidationConstraint,
  validationMessageKey,
} from '../../platform/runtime/i18n/i18n.translate';

export interface ValidationErrorDetail {
  readonly field: string;
  readonly reason: string;
}

const constraintValuePatterns: Partial<Record<ValidationConstraint, RegExp>> = {
  arrayMaxSize: /must contain no more than (.+) elements$/,
  arrayMinSize: /must contain at least (.+) elements$/,
  isEnum: /must be one of the following values: (.+)$/,
  isIn: /must be one of the following values: (.+)$/,
  matches: /must match (.+) regular expression$/,
  max: /must not be greater than (.+)$/,
  maxLength: /must be shorter than or equal to (.+) characters$/,
  min: /must not be less than (.+)$/,
  minLength: /must be longer than or equal to (.+) characters$/,
};

function localizedValidationReason(
  constraint: string,
  fallback: string,
  property: string,
): string {
  const messageKey = validationMessageKey(constraint);

  if (!messageKey) {
    return fallback;
  }

  const validationConstraint = constraint as ValidationConstraint;
  const valuePattern = constraintValuePatterns[validationConstraint];
  const constraintValue = valuePattern?.exec(fallback)?.[1];

  if (valuePattern && !constraintValue) {
    return fallback;
  }

  const args: Record<string, unknown> = { property };

  if (constraintValue) {
    // AI modified: retain validator limits and allowed values when translating the surrounding message.
    const argumentName =
      validationConstraint === 'isEnum' || validationConstraint === 'isIn'
        ? 'allowedValues'
        : 'constraint';
    args[argumentName] = constraintValue;
  }

  return translateKey(messageKey, {
    args,
    defaultValue: fallback,
  });
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
        reason: localizedValidationReason(constraint, fallback, error.property),
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
