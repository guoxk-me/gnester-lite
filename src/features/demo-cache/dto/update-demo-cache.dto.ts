import { PickType } from '@nestjs/mapped-types';
import { CreateDemoCacheDto } from './create-demo-cache.dto';

export class UpdateDemoCacheDto extends PickType(CreateDemoCacheDto, [
  'value',
] as const) {}
