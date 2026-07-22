// CN: DTO 文件，定义 demo-serialization 的数据结构；EN: DTO file defines data shapes for demo-serialization.
import { Exclude, Expose, Transform } from 'class-transformer';
import { DemoSerializationRoleDto } from './demo-serialization-role.dto';

@Exclude()
export class DemoSerializationUserDto {
  @Expose()
  readonly id: number;

  @Expose()
  readonly firstName: string;

  @Expose()
  readonly lastName: string;

  @Expose({ toClassOnly: true })
  readonly email: string;

  @Exclude()
  readonly password: string;

  @Expose()
  @Transform(({ value }: { value: DemoSerializationRoleDto }) => value.name, {
    toPlainOnly: true,
  })
  readonly role: DemoSerializationRoleDto;

  @Expose({ groups: ['admin'] })
  readonly auditTrail: string[];

  readonly _internalTraceId: string;

  // CN: 初始化 demo-serialization 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-serialization.
  constructor(partial: Partial<DemoSerializationUserDto>) {
    Object.assign(this, partial);
  }

  // CN: 读取 full name 派生值；EN: Reads the derived full name value.
  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // CN: 读取 email address 派生值；EN: Reads the derived email address value.
  @Expose()
  get emailAddress(): string {
    return this.email;
  }
}
