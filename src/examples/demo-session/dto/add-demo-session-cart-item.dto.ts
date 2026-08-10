import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DEMO_SESSION_MAX_QUANTITY_PER_SKU } from '../demo-session.types';

export const DEMO_SESSION_SKU_MAX_LENGTH = 64;
export const DEMO_SESSION_SKU_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export class AddDemoSessionCartItemDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(DEMO_SESSION_SKU_MAX_LENGTH)
  @Matches(DEMO_SESSION_SKU_PATTERN)
  readonly sku!: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  readonly name?: string;

  @IsInt()
  @Min(1)
  @Max(DEMO_SESSION_MAX_QUANTITY_PER_SKU)
  readonly quantity!: number;
}
