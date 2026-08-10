import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { MAX_EMAIL_ADDRESS_LENGTH } from '../../../contracts/input-validation.constants';

export const DEMO_QUEUE_EMAIL_SUBJECT_MAX_LENGTH = 120;
export const DEMO_QUEUE_EMAIL_BODY_MAX_LENGTH = 2_000;

export class CreateDemoEmailJobDto {
  // AI modified: bound persisted queue payload text before jobs enter Redis.
  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    maxLength: MAX_EMAIL_ADDRESS_LENGTH,
  })
  @IsEmail()
  @MaxLength(MAX_EMAIL_ADDRESS_LENGTH)
  to!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_QUEUE_EMAIL_SUBJECT_MAX_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_QUEUE_EMAIL_SUBJECT_MAX_LENGTH)
  subject!: string;

  @ApiPropertyOptional({ maxLength: DEMO_QUEUE_EMAIL_BODY_MAX_LENGTH })
  @IsString()
  @IsOptional()
  @MaxLength(DEMO_QUEUE_EMAIL_BODY_MAX_LENGTH)
  body?: string;
}
