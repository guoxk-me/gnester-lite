import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

import {
  createValidationPipe,
  validationExceptionFactory,
} from './validation.pipe';

class ValidationPipeTestDto {
  @IsString()
  readonly name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly count!: number;
}

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: ValidationPipeTestDto,
};

describe('validation pipe helpers', () => {
  it('transforms declared fields with secure defaults', async () => {
    const pipe = createValidationPipe();

    await expect(
      pipe.transform(
        {
          name: 'example',
          count: '2',
        },
        bodyMetadata,
      ),
    ).resolves.toEqual({
      name: 'example',
      count: 2,
    });
  });

  it('rejects undeclared fields with the stable sanitized error contract', async () => {
    const pipe = createValidationPipe();

    await expect(
      pipe.transform(
        {
          name: 'example',
          count: 2,
          unexpected: 'not accepted',
        },
        bodyMetadata,
      ),
    ).rejects.toMatchObject({
      response: {
        code: 400,
        message: 'Validation failed',
        data: null,
        errors: [
          {
            field: 'unexpected',
            reason: 'property unexpected should not exist',
          },
        ],
      },
    });
  });

  it('does not expose rejected field values in validation responses', async () => {
    const pipe = createValidationPipe();
    const secretSentinel = 'validation-private-value';

    try {
      await pipe.transform(
        {
          name: 123,
          count: secretSentinel,
        },
        bodyMetadata,
      );
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(
        JSON.stringify((error as BadRequestException).getResponse()),
      ).not.toContain(secretSentinel);
    }
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
      data: null,
      errors: [
        {
          field: 'items.0.name',
          reason: 'name should not be empty',
        },
      ],
    });
  });
});
