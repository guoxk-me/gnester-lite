// CN: 迁移文件，描述数据库结构变更；EN: Migration file describes database schema changes.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDemoTable1760000000000 implements MigrationInterface {
  name = 'CreateDemoTable1760000000000';

  // CN: 执行 database migration 的 up 逻辑；EN: Runs the up logic for database migration.
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `demo` (`id` int NOT NULL AUTO_INCREMENT COMMENT "Demo row id Demo 记录 ID", `name` varchar(20) NOT NULL COMMENT "Demo name Demo 名称", `description` varchar(255) NOT NULL COMMENT "Demo description Demo 描述", PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
  }

  // CN: 执行 database migration 的 down 逻辑；EN: Runs the down logic for database migration.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `demo`');
  }
}
