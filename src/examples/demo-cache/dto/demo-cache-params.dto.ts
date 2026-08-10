import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

import {
  DEMO_CACHE_KEY_MAX_LENGTH,
  DEMO_CACHE_KEY_PATTERN,
} from './create-demo-cache.dto';

export class DemoCacheKeyParamsDto {
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsString()
  @MaxLength(DEMO_CACHE_KEY_MAX_LENGTH)
  @Matches(DEMO_CACHE_KEY_PATTERN)
  readonly key!: string;
}

export class DemoCacheVariantParamsDto {
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsString()
  @MaxLength(DEMO_CACHE_KEY_MAX_LENGTH)
  @Matches(DEMO_CACHE_KEY_PATTERN)
  readonly variant!: string;
}
