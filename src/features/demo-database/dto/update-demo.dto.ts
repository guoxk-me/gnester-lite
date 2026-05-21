import { PartialType } from '@nestjs/mapped-types';
import { CreateDemoDto } from './create-demo.dto';

// UpdateDemoDto extends CreateDemoDto with all fields optional. UpdateDemoDto 继承 CreateDemoDto，并让所有字段可选。

// Use PartialType() passing the class reference as an argument. 使用 PartialType() 并传入类引用。
export class UpdateDemoDto extends PartialType(CreateDemoDto) {}

// Use OmitType() to construct a type and remove description. 使用 OmitType() 构造类型并移除 description。
// import { OmitType } from '@nestjs/mapped-types';
// export class UpdateDemoDto extends OmitType(CreateDemoDto, [
//   'description',
// ] as const) {}

// Use PickType() to pick the name property. 使用 PickType() 选择 name 属性。
// import { PickType } from '@nestjs/mapped-types';
// export class UpdateDemoDto extends PickType(CreateDemoDto, ['name'] as const) {}

// Use IntersectionType() to combine multiple DTOs into one. 使用 IntersectionType() 将多个 DTO 合并为一个。
// import { IntersectionType } from '@nestjs/mapped-types';
// class DtoA {
//   propA: string;
// }
// class DtoB {
//   propB: number;
// }
// export class UpdateDemoDto extends IntersectionType(DtoA, DtoB) {}
