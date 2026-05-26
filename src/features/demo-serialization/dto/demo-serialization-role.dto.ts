export class DemoSerializationRoleDto {
  readonly id: number;
  readonly name: string;
  readonly permissions: string[];

  constructor(partial: Partial<DemoSerializationRoleDto>) {
    Object.assign(this, partial);
  }
}
