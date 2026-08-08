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
  DEMO_SESSION_ROLES,
  type DemoSessionRole,
} from '../demo-session.types';

export class CreateDemoSessionLoginDto {
  // AI modified: session identity text must stay bounded and display names cannot be blank.
  @ApiProperty({
    minLength: 1,
    maxLength: 64,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  readonly userId!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 80,
    pattern: '\\S',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(80)
  readonly displayName!: string;

  @ApiPropertyOptional({ enum: DEMO_SESSION_ROLES })
  @IsIn(DEMO_SESSION_ROLES)
  @IsOptional()
  readonly role?: DemoSessionRole;
}
