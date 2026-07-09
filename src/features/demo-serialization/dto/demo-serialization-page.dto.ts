// CN: DTO 文件，定义 demo-serialization 的数据结构；EN: DTO file defines data shapes for demo-serialization.
import { Type } from 'class-transformer';
import { DemoSerializationUserDto } from './demo-serialization-user.dto';

export class DemoSerializationPageDto {
  @Type(() => DemoSerializationUserDto)
  readonly data: DemoSerializationUserDto[];

  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly _cacheKey: string;

  // CN: 初始化 demo-serialization 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-serialization.
  constructor(partial: Partial<DemoSerializationPageDto>) {
    Object.assign(this, partial);
  }
}
