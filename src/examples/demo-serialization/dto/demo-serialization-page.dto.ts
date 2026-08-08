import { Type } from 'class-transformer';
import { DemoSerializationUserDto } from './demo-serialization-user.dto';

export class DemoSerializationPageDto {
  @Type(() => DemoSerializationUserDto)
  readonly data!: DemoSerializationUserDto[];

  readonly total!: number;
  readonly page!: number;
  readonly limit!: number;
  readonly _cacheKey!: string;

  constructor(partial: Partial<DemoSerializationPageDto>) {
    Object.assign(this, partial);
  }
}
