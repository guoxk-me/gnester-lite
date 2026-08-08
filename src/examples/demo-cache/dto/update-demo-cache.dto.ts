import { PickType } from '@nestjs/swagger';
import { CreateDemoCacheDto } from './create-demo-cache.dto';

// AI modified: Swagger helpers preserve inherited fields in the generated API contract.
export class UpdateDemoCacheDto extends PickType(CreateDemoCacheDto, [
  'value',
] as const) {}
