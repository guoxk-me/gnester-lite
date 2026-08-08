import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

import { DEMO_DATABASE_MAX_NAME_LENGTH } from './create-demo.dto';

export class SearchDemoQueryDto {
  @ApiProperty({
    example: 'hello',
    maxLength: DEMO_DATABASE_MAX_NAME_LENGTH,
    minLength: 1,
    pattern: '\\S',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_DATABASE_MAX_NAME_LENGTH)
  readonly keyword!: string;
}
