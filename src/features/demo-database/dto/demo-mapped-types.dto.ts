// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
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
