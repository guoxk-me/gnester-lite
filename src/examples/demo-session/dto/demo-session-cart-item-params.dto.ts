import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

import {
  DEMO_SESSION_SKU_MAX_LENGTH,
  DEMO_SESSION_SKU_PATTERN,
} from './add-demo-session-cart-item.dto';

export class DemoSessionCartItemParamsDto {
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_SESSION_SKU_MAX_LENGTH,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsString()
  @MaxLength(DEMO_SESSION_SKU_MAX_LENGTH)
  @Matches(DEMO_SESSION_SKU_PATTERN)
  readonly sku!: string;
}
