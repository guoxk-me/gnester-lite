// CN: 测试文件，验证 validation common 的行为契约；EN: Test file verifies behavior contracts for validation common.
import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';

import {
  createValidationPipe,
  validationExceptionFactory,
} from './validation.pipe';
import { Environment } from 'config/config.types';

// CN: 测试分组：validation pipe helpers；EN: Test group: validation pipe helpers.
describe('validation pipe helpers', () => {
  // CN: 测试用例：builds the shared ValidationPipe with secure defaults；EN: Test case: builds the shared ValidationPipe with secure defaults.
  it('builds the shared ValidationPipe with secure defaults', () => {
    const pipe = createValidationPipe(Environment.Development);

    expect(pipe).toBeDefined();
  });

  // CN: 测试用例：flattens nested validation errors into field paths；EN: Test case: flattens nested validation errors into field paths.
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
