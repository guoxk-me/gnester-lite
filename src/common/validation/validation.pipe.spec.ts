import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';

import {
  createValidationPipe,
  validationExceptionFactory,
} from './validation.pipe';
import { Environment } from 'config/config.types';

describe('validation pipe helpers', () => {
  it('builds the shared ValidationPipe with secure defaults', () => {
    const pipe = createValidationPipe(Environment.Development);

    expect(pipe).toBeDefined();
  });

  it('flattens nested validation errors into field paths', () => {
    const exception = validationExceptionFactory([
      {
        property: 'items',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'name',
                constraints: {
                  isNotEmpty: 'name should not be empty',
                },
              } as ValidationError,
            ],
          } as ValidationError,
        ],
      } as ValidationError,
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getResponse()).toEqual({
      code: 400,
      message: 'Validation failed',
      errors: [
        {
          field: 'items.0.name',
          reason: 'name should not be empty',
        },
      ],
    });
  });
});
