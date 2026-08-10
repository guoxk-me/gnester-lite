import { MigrationInterface, QueryRunner } from 'typeorm';

// AI modified: example ownership changed without renaming the recorded migration history entry.
export class CreateDemoTable1760000000000 implements MigrationInterface {
  name = 'CreateDemoTable1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // AI modified: single-quoted literals remain valid when MySQL enables ANSI_QUOTES.
    await queryRunner.query(
      "CREATE TABLE `demo` (`id` int NOT NULL AUTO_INCREMENT COMMENT 'Demo row id Demo 记录 ID', `name` varchar(20) NOT NULL COMMENT 'Demo name Demo 名称', `description` varchar(255) NOT NULL COMMENT 'Demo description Demo 描述', PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `demo`');
  }
}
