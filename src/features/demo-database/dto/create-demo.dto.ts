// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDemoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  readonly description: string;
}
