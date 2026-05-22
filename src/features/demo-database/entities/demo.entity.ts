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
