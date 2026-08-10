import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';

import { CreateDemoDto } from './create-demo.dto';

export const DEMO_DATABASE_MAX_BATCH_SIZE = 50;

export class BulkCreateDemoDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(DEMO_DATABASE_MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => CreateDemoDto)
  readonly items!: CreateDemoDto[];
}
