import {
  ApiProperty,
  IntersectionType,
  OmitType,
  PickType,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

import { CreateDemoDto } from './create-demo.dto';

// AI modified: Swagger helpers keep mapped request and response fields in OpenAPI.
export class UpdateDemoDescriptionDto extends PickType(CreateDemoDto, [
  'description',
] as const) {}

export class DemoNameOnlyDto extends OmitType(CreateDemoDto, [
  'description',
] as const) {}

export class DemoAuditDto {
  // AI modified: audit correlation identifiers cannot be whitespace-only.
  @ApiProperty({ minLength: 1, maxLength: 64, pattern: '\\S' })
  @IsNotEmpty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(64)
  readonly requestId!: string;
}

export class CreateDemoWithAuditDto extends IntersectionType(
  CreateDemoDto,
  DemoAuditDto,
) {}
