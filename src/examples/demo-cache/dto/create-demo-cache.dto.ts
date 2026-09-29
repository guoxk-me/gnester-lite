import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export const DEMO_CACHE_KEY_MAX_LENGTH = 64;
export const DEMO_CACHE_KEY_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export class CreateDemoCacheDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(DEMO_CACHE_KEY_MAX_LENGTH)
  @Matches(DEMO_CACHE_KEY_PATTERN)
  readonly key!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  readonly value!: string;
}
