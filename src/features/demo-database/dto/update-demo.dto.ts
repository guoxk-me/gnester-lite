// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
import { PartialType } from '@nestjs/mapped-types';
import { CreateDemoDto } from './create-demo.dto';

export class UpdateDemoDto extends PartialType(CreateDemoDto) {}
