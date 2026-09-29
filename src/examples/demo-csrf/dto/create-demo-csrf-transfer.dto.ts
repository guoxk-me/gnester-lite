import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const DEMO_CSRF_RECIPIENT_MAX_LENGTH = 120;

export class CreateDemoCsrfTransferDto {
  // AI modified: a transfer recipient must be meaningful and bounded before it reaches business logic.
  @ApiProperty({
    example: 'alice@example.com',
    minLength: 1,
    maxLength: DEMO_CSRF_RECIPIENT_MAX_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_CSRF_RECIPIENT_MAX_LENGTH)
  readonly recipient!: string;

  @ApiProperty({ minimum: 1, maximum: 10_000 })
  @IsNumber()
  @Min(1)
  @Max(10_000)
  readonly amount!: number;
}
