import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import {
  DEMO_HTTP_POST_MAX_BODY_LENGTH,
  DEMO_HTTP_POST_MAX_ID,
  DEMO_HTTP_POST_MAX_TITLE_LENGTH,
} from '../demo-http.constants';

export class DemoHttpPostDto {
  // AI modified: validate upstream responses against the same bounds accepted at the HTTP boundary.
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_HTTP_POST_MAX_ID,
  })
  @IsInt()
  @Min(1)
  @Max(DEMO_HTTP_POST_MAX_ID)
  readonly userId!: number;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_HTTP_POST_MAX_ID,
  })
  @IsInt()
  @Min(1)
  @Max(DEMO_HTTP_POST_MAX_ID)
  readonly id!: number;

  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_HTTP_POST_MAX_TITLE_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_HTTP_POST_MAX_TITLE_LENGTH)
  readonly title!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_HTTP_POST_MAX_BODY_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_HTTP_POST_MAX_BODY_LENGTH)
  readonly body!: string;
}
