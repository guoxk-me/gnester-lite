// CN: DTO 文件，定义 demo-events 的数据结构；EN: DTO file defines data shapes for demo-events.
import { IsString, MaxLength, MinLength } from 'class-validator';

export class InvalidateDemoCacheDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  cacheKey: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  reason: string;
}
