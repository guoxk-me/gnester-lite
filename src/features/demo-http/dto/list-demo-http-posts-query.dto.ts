// CN: DTO 文件，定义 demo-http 的数据结构；EN: DTO file defines data shapes for demo-http.
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListDemoHttpPostsQueryDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  readonly userId?: number;
}
