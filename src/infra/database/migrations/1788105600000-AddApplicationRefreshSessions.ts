import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicationRefreshSessions1788105600000 implements MigrationInterface {
  name = 'AddApplicationRefreshSessions1788105600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // AI modified: the existing session table now records whether refresh can persist across browser restarts.
    await queryRunner.query(
      'ALTER TABLE `session` ADD `rememberMe` boolean NOT NULL DEFAULT false',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `session` DROP COLUMN `rememberMe`');
  }
}
