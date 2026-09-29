import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserManagement1785900000000 implements MigrationInterface {
  name = 'AddUserManagement1785900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // AI modified: persist admin authorization, account disabling, and one-time invitations in the auth database.
    await queryRunner.query(
      "ALTER TABLE `user` ADD `role` varchar(255) NOT NULL DEFAULT 'user'",
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD `banned` boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query('ALTER TABLE `user` ADD `banReason` text NULL');
    await queryRunner.query(
      'ALTER TABLE `user` ADD `banExpires` timestamp(3) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `session` ADD `impersonatedBy` varchar(36) NULL',
    );
    await queryRunner.query(
      // AI modified: the unique generated key closes the concurrent duplicate-invitation gap.
      'CREATE TABLE `user_invitation` (`id` varchar(36) NOT NULL, `email` varchar(255) NOT NULL, `tokenHash` char(64) NOT NULL, `invitedBy` varchar(36) NOT NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `expiresAt` timestamp(3) NOT NULL, `acceptedAt` timestamp(3) NULL, `revokedAt` timestamp(3) NULL, `openEmail` varchar(255) GENERATED ALWAYS AS (CASE WHEN `acceptedAt` IS NULL AND `revokedAt` IS NULL THEN `email` ELSE NULL END) STORED, UNIQUE INDEX `IDX_user_invitation_token` (`tokenHash`), UNIQUE INDEX `IDX_user_invitation_open_email` (`openEmail`), INDEX `IDX_user_invitation_email` (`email`), PRIMARY KEY (`id`), CONSTRAINT `FK_user_invitation_inviter` FOREIGN KEY (`invitedBy`) REFERENCES `user`(`id`)) ENGINE=InnoDB',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `user_invitation`');
    await queryRunner.query(
      'ALTER TABLE `session` DROP COLUMN `impersonatedBy`',
    );
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `banExpires`');
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `banReason`');
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `banned`');
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `role`');
  }
}
