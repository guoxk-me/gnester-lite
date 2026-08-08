import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const DEMO_DATABASE_MAX_ID = 2_147_483_647;

export class DemoIdParamsDto {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_DATABASE_MAX_ID,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_DATABASE_MAX_ID)
  readonly id!: number;
}
