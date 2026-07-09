// CN: DTO 文件，定义 demo-cache 的数据结构；EN: DTO file defines data shapes for demo-cache.
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateDemoCacheDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  readonly key: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  readonly value: string;
}
