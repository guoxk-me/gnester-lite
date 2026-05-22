import { IntersectionType, OmitType, PickType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { CreateDemoDto } from './create-demo.dto';

export class UpdateDemoDescriptionDto extends PickType(CreateDemoDto, [
  'description',
] as const) {}

export class DemoNameOnlyDto extends OmitType(CreateDemoDto, [
  'description',
] as const) {}

export class DemoAuditDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  readonly requestId: string;
}

export class CreateDemoWithAuditDto extends IntersectionType(
  CreateDemoDto,
  DemoAuditDto,
) {}
