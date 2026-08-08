import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { DEMO_HTTP_POST_MAX_ID } from '../demo-http.constants';

export class ListDemoHttpPostsQueryDto {
  // AI modified: keep optional upstream identifiers inside JavaScript's exact integer domain.
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_HTTP_POST_MAX_ID,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(DEMO_HTTP_POST_MAX_ID)
  @Type(() => Number)
  readonly userId?: number;
}
