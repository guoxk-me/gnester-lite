// CN: 实体文件，定义 demo-database 的数据库映射；EN: Entity file defines database mapping for demo-database.
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Demo {
  @PrimaryGeneratedColumn({ comment: 'Demo row id Demo 记录 ID' })
  readonly id: number;

  @Column({ length: 20, comment: 'Demo name Demo 名称' })
  readonly name: string;

  @Column({ comment: 'Demo description Demo 描述' })
  readonly description: string;
}
