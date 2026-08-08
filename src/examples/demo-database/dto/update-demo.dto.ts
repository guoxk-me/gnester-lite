import { PartialType } from '@nestjs/swagger';
import { CreateDemoDto } from './create-demo.dto';

// AI modified: Swagger helpers expose inherited optional fields in OpenAPI.
export class UpdateDemoDto extends PartialType(CreateDemoDto) {}
