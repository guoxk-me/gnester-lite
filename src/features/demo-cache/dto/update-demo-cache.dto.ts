// CN: DTO 文件，定义 demo-cache 的数据结构；EN: DTO file defines data shapes for demo-cache.
import { PickType } from '@nestjs/mapped-types';
import { CreateDemoCacheDto } from './create-demo-cache.dto';

export class UpdateDemoCacheDto extends PickType(CreateDemoCacheDto, [
  'value',
] as const) {}
