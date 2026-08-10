import { Exclude, Expose, Transform } from 'class-transformer';
import { DemoSerializationRoleDto } from './demo-serialization-role.dto';

@Exclude()
export class DemoSerializationUserDto {
  @Expose()
  readonly id!: number;

  @Expose()
  readonly firstName!: string;

  @Expose()
  readonly lastName!: string;

  @Expose({ toClassOnly: true })
  readonly email!: string;

  @Exclude()
  readonly password!: string;

  @Expose()
  @Transform(({ value }: { value: DemoSerializationRoleDto }) => value.name, {
    toPlainOnly: true,
  })
  readonly role!: DemoSerializationRoleDto;

  @Expose({ groups: ['admin'] })
  readonly auditTrail!: string[];

  readonly _internalTraceId!: string;

  constructor(partial: Partial<DemoSerializationUserDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Expose()
  get emailAddress(): string {
    return this.email;
  }
}
