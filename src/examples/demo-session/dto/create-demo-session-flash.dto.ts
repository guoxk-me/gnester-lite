import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  DEMO_SESSION_FLASH_LEVELS,
  type DemoSessionFlashLevel,
} from '../demo-session.types';

export class CreateDemoSessionFlashDto {
  // AI modified: do not retain whitespace-only flash messages in session storage.
  @ApiProperty({
    minLength: 1,
    maxLength: 160,
    pattern: '\\S',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  readonly message!: string;

  @ApiPropertyOptional({ enum: DEMO_SESSION_FLASH_LEVELS })
  @IsIn(DEMO_SESSION_FLASH_LEVELS)
  @IsOptional()
  readonly level?: DemoSessionFlashLevel;
}
