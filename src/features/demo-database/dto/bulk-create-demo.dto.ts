// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';

import { CreateDemoDto } from './create-demo.dto';

export class BulkCreateDemoDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateDemoDto)
  readonly items: CreateDemoDto[];
}
