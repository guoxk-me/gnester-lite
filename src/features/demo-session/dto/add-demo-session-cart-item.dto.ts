// CN: DTO 文件，定义 demo-session 的数据结构；EN: DTO file defines data shapes for demo-session.
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

export class AddDemoSessionCartItemDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  readonly sku: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  readonly name?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  readonly quantity: number;
}
