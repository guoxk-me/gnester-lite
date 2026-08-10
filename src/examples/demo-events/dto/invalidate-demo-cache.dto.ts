import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class InvalidateDemoCacheDto {
  // AI modified: cache invalidation events require bounded, nonblank context.
  @ApiProperty({ minLength: 3, maxLength: 120, pattern: '\\S' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/\S/)
  cacheKey!: string;

  @ApiProperty({ minLength: 3, maxLength: 160, pattern: '\\S' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/\S/)
  reason!: string;
}
