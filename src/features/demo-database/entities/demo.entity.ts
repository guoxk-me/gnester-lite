import { Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
// import { Exclude, Transform } from 'class-transformer';

@Entity()
export class Demo {
  @PrimaryGeneratedColumn({ comment: 'Demo row id Demo 记录 ID' })
  readonly id: number;

  @Column({ length: 20, comment: 'Demo name Demo 名称' })
  readonly name: string;

  @Expose()
  // Use Expose to expose property, similar to getter. 使用 Expose 暴露属性，类似 getter。
  get nameWithId(): string {
    return `${this.name}#${this.id}`;
  }

  // @Transform(({ value }) => value.toUpperCase())
  // Use Transform to transform property value during serialization. 使用 Transform 在序列化过程中转换属性值。

  // @Exclude()
  // Use Exclude to exclude property from serialization. 使用 Exclude 从序列化中排除属性。
  @Column({ comment: 'Demo description Demo 描述' })
  readonly description: string;
}
