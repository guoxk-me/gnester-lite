// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum DemoSortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

export class ListDemoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
