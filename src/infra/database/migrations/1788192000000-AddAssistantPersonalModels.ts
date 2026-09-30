import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantPersonalModels1788192000000 implements MigrationInterface {
  name = 'AddAssistantPersonalModels1788192000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // AI modified: personal model credentials and choices belong to the signed-in account.
    await queryRunner.query(
      'CREATE TABLE `assistant_key` (`id` varchar(36) NOT NULL, `userId` varchar(36) NOT NULL, `provider` varchar(16) NOT NULL, `name` varchar(80) NOT NULL, `encryptedKey` text NOT NULL, `isEnabled` tinyint(1) NOT NULL DEFAULT 1, `isPendingDeletion` tinyint(1) NOT NULL DEFAULT 0, `position` int NOT NULL DEFAULT 0, `lastErrorCode` varchar(64) NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), INDEX `IDX_assistant_key_user_provider` (`userId`, `provider`, `position`), PRIMARY KEY (`id`), CONSTRAINT `FK_assistant_key_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE `assistant_key_model` (`keyId` varchar(36) NOT NULL, `modelId` varchar(100) NOT NULL, `isTextCompatible` tinyint(1) NOT NULL, `missingCount` int NOT NULL DEFAULT 0, `lastSeenAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`keyId`, `modelId`), CONSTRAINT `FK_assistant_key_model_key` FOREIGN KEY (`keyId`) REFERENCES `assistant_key`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE `assistant_preferences` (`userId` varchar(36) NOT NULL, `defaultProvider` varchar(16) NULL, `defaultModel` varchar(100) NULL, `backupModels` text NOT NULL, `modelNotice` text NULL, `openaiConsentVersion` varchar(32) NULL, `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (`userId`), CONSTRAINT `FK_assistant_preferences_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'ALTER TABLE `assistant_conversation` ADD `provider` varchar(16) NULL, ADD `model` varchar(100) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `assistant_answer` ADD `provider` varchar(16) NULL, ADD `keyId` varchar(36) NULL, ADD INDEX `IDX_assistant_answer_key_active` (`keyId`, `status`)',
    );
    await queryRunner.query(
      "UPDATE `assistant_answer` SET `provider` = 'deepseek' WHERE `provider` IS NULL",
    );
    // AI modified: retain the model of existing conversations while removing their shared credential.
    await queryRunner.query(
      "UPDATE `assistant_conversation` c SET c.`provider` = 'deepseek', c.`model` = COALESCE((SELECT a.`model` FROM `assistant_answer` a INNER JOIN `assistant_turn` t ON t.`id` = a.`turnId` WHERE t.`conversationId` = c.`id` ORDER BY t.`createdAt` DESC, a.`version` DESC LIMIT 1), 'deepseek-flash')",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `assistant_answer` DROP INDEX `IDX_assistant_answer_key_active`, DROP COLUMN `keyId`, DROP COLUMN `provider`',
    );
    await queryRunner.query(
      'ALTER TABLE `assistant_conversation` DROP COLUMN `model`, DROP COLUMN `provider`',
    );
    await queryRunner.query('DROP TABLE `assistant_preferences`');
    await queryRunner.query('DROP TABLE `assistant_key_model`');
    await queryRunner.query('DROP TABLE `assistant_key`');
  }
}
