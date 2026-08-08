import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export const DEMO_DATABASE_MAX_NAME_LENGTH = 20;
export const DEMO_DATABASE_MAX_DESCRIPTION_LENGTH = 255;

export class CreateDemoDto {
  // AI modified: persist only meaningful text that fits the entity column contract.
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_DATABASE_MAX_NAME_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_DATABASE_MAX_NAME_LENGTH)
  readonly name!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_DATABASE_MAX_DESCRIPTION_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_DATABASE_MAX_DESCRIPTION_LENGTH)
  readonly description!: string;
}
