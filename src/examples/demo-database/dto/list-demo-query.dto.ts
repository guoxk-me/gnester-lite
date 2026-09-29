import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEMO_DATABASE_MAX_PAGE = 10_000;

export enum DemoSortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

export class ListDemoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_DATABASE_MAX_PAGE)
  // AI modified: bounded offsets cannot overflow JavaScript or create accidental unbounded scans.
  readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number = 10;

  @IsOptional()
  @IsEnum(DemoSortOrder)
  readonly order: DemoSortOrder = DemoSortOrder.Asc;
}
