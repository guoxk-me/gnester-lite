import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantConversations1785986400000 implements MigrationInterface {
  name = 'AddAssistantConversations1785986400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // AI modified: account-owned conversations and answer versions survive browser disconnects.
    await queryRunner.query(
      'CREATE TABLE `assistant_conversation` (`id` varchar(36) NOT NULL, `userId` varchar(36) NOT NULL, `title` varchar(255) NOT NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX `IDX_assistant_conversation_user_updated` (`userId`, `updatedAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_assistant_conversation_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE `assistant_turn` (`id` varchar(36) NOT NULL, `conversationId` varchar(36) NOT NULL, `question` text NOT NULL, `contextSnapshot` longtext NOT NULL, `selectedAnswerId` varchar(36) NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX `IDX_assistant_turn_conversation_created` (`conversationId`, `createdAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_assistant_turn_conversation` FOREIGN KEY (`conversationId`) REFERENCES `assistant_conversation`(`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );
    await queryRunner.query(
      // AI modified: a unique active account key enforces one generation per account across workers.
      "CREATE TABLE `assistant_answer` (`id` varchar(36) NOT NULL, `turnId` varchar(36) NOT NULL, `userId` varchar(36) NOT NULL, `version` int NOT NULL, `content` longtext NOT NULL, `status` varchar(16) NOT NULL, `model` varchar(100) NOT NULL, `errorCode` varchar(64) NULL, `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `activeUserId` varchar(36) GENERATED ALWAYS AS (CASE WHEN `status` IN ('queued', 'generating') THEN `userId` ELSE NULL END) STORED, UNIQUE INDEX `IDX_assistant_answer_active_user` (`activeUserId`), UNIQUE INDEX `IDX_assistant_answer_turn_version` (`turnId`, `version`), INDEX `IDX_assistant_answer_user_status` (`userId`, `status`), PRIMARY KEY (`id`), CONSTRAINT `FK_assistant_answer_turn` FOREIGN KEY (`turnId`) REFERENCES `assistant_turn`(`id`) ON DELETE CASCADE) ENGINE=InnoDB",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `assistant_answer`');
    await queryRunner.query('DROP TABLE `assistant_turn`');
    await queryRunner.query('DROP TABLE `assistant_conversation`');
  }
}
