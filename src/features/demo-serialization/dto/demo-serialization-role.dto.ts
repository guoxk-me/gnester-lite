// CN: DTO 文件，定义 demo-serialization 的数据结构；EN: DTO file defines data shapes for demo-serialization.
export class DemoSerializationRoleDto {
  readonly id: number;
  readonly name: string;
  readonly permissions: string[];

  // CN: 初始化 demo-serialization 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-serialization.
  constructor(partial: Partial<DemoSerializationRoleDto>) {
    Object.assign(this, partial);
  }
}
