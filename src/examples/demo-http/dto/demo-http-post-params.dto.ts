import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

import { DEMO_HTTP_POST_MAX_ID } from '../demo-http.constants';

export class DemoHttpPostParamsDto {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_HTTP_POST_MAX_ID,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_HTTP_POST_MAX_ID)
  readonly id!: number;
}
