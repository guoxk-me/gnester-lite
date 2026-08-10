import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { I18nContext } from 'nestjs-i18n';

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

enum ValidationPipeTestSortOrder {
  Ascending = 'ASC',
  Descending = 'DESC',
}

class LocalizedValidationPipeTestDto {
  @IsString()
  @MaxLength(5)
  readonly name!: string;

  @IsString()
  @MinLength(2)
  readonly tag!: string;

  @Type(() => Number)
  @IsInt()
  @Max(10)
  readonly maximum!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly minimum!: number;

  @IsIn(['member', 'admin'])
  readonly role!: string;

  @IsEnum(ValidationPipeTestSortOrder)
  readonly sort!: ValidationPipeTestSortOrder;
}

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: ValidationPipeTestDto,
};

const localizedBodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: LocalizedValidationPipeTestDto,
};

function readLocaleMessages(fileName: string): Record<string, string> {
  return JSON.parse(
    readFileSync(
      join(__dirname, '../../platform/runtime/i18n/locales/zh', fileName),
      'utf8',
    ),
  ) as Record<string, string>;
}

const chineseMessages = {
  errors: readLocaleMessages('errors.json'),
  validation: readLocaleMessages('validation.json'),
};

function useChineseTranslations(): void {
  jest.spyOn(I18nContext, 'current').mockReturnValue({
    lang: 'zh',
    t: (
      key: string,
      options?: {
        readonly args?: Record<string, unknown>;
        readonly defaultValue?: string;
      },
    ) => {
      const [namespace, messageKey] = key.split('.', 2);
      const messages =
        namespace === 'errors'
          ? chineseMessages.errors
          : chineseMessages.validation;
      const template =
        (messageKey ? messages[messageKey] : undefined) ??
        options?.defaultValue ??
        key;

      return template.replace(
        /\{([A-Za-z][A-Za-z0-9_]*)\}/g,
        (placeholder, argumentName: string) => {
          const argument = options?.args?.[argumentName];

          return typeof argument === 'string' ||
            typeof argument === 'number' ||
            typeof argument === 'boolean'
            ? String(argument)
            : placeholder;
        },
      );
    },
  } as unknown as I18nContext);
}

describe('validation pipe helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('localizes constraints without discarding their limits or allowed values', async () => {
    useChineseTranslations();
    const pipe = createValidationPipe();

    await expect(
      pipe.transform(
        {
          name: 'abcdef',
          tag: '',
          maximum: 11,
          minimum: 0,
          role: 'owner',
          sort: 'NEWEST',
        },
        localizedBodyMetadata,
      ),
    ).rejects.toMatchObject({
      response: {
        code: 400,
        message: '校验失败',
        data: null,
        errors: [
          {
            field: 'name',
            reason: 'name 长度不能超过 5 个字符',
          },
          {
            field: 'tag',
            reason: 'tag 长度不能少于 2 个字符',
          },
          {
            field: 'maximum',
            reason: 'maximum 不能大于 10',
          },
          {
            field: 'minimum',
            reason: 'minimum 不能小于 1',
          },
          {
            field: 'role',
            reason: 'role 必须是以下值之一：member, admin',
          },
          {
            field: 'sort',
            reason: 'sort 必须是以下值之一：ASC, DESC',
          },
        ],
      },
    });
  });
});
