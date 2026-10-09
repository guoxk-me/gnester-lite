import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantConfigurationControls1791504000000 implements MigrationInterface {
  name = 'AddAssistantConfigurationControls1791504000000';

  async up(runner: QueryRunner): Promise<void> {
    // AI modified: personal model switches survive catalog refreshes and apply across the owner's Keys.
    await runner.query(
      'CREATE TABLE `assistant_model_preference` (`userId` varchar(36) NOT NULL, `provider` varchar(16) NOT NULL, `modelId` varchar(100) NOT NULL, `isEnabled` tinyint(1) NOT NULL DEFAULT 1, `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (`userId`, `provider`, `modelId`), CONSTRAINT `FK_assistant_model_preference_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    // AI modified: append safe configuration events independently of credential deletion.
    await runner.query(
      'CREATE TABLE `assistant_configuration_audit` (`id` varchar(36) NOT NULL, `userId` varchar(36) NOT NULL, `action` varchar(40) NOT NULL, `targetId` varchar(160) NOT NULL, `provider` varchar(16) NULL, `modelId` varchar(100) NULL, `outcome` varchar(16) NOT NULL, `errorCode` varchar(64) NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), INDEX `IDX_assistant_configuration_audit_user_time` (`userId`, `createdAt`)) ENGINE=InnoDB',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE `assistant_configuration_audit`');
    await runner.query('DROP TABLE `assistant_model_preference`');
  }
}
