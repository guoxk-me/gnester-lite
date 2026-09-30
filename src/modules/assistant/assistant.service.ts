import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource, type QueryRunner } from 'typeorm';

import {
  AssistantCancellation,
  AssistantGenerationService,
} from './assistant-generation.service.js';
import type { AssistantModelChoice } from './model.types.js';
import type {
  AssistantAnswerRow,
  AssistantConversationRow,
  AssistantTurnRow,
} from './conversation-persistence.types.js';
import type { AssistantModelMessage } from './generation.types.js';
import type {
  PreviousTurnRow,
  VersionRow,
} from './conversation-persistence.types.js';
import type {
  ConversationSummary,
  AnswerView,
  ConversationView,
} from './conversation.types.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';

@Injectable()
export class AssistantService {
  constructor(
    private readonly database: DataSource,
    private readonly configuration: AssistantConfigurationService,
    private readonly generation: AssistantGenerationService,
    private readonly cancellation: AssistantCancellation,
  ) {}

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await this.database.query<
      (AssistantConversationRow & { activeAnswerId: string | null })[]
    >(
      "SELECT c.*, a.`id` AS `activeAnswerId` FROM `assistant_conversation` c LEFT JOIN `assistant_turn` t ON t.`conversationId` = c.`id` LEFT JOIN `assistant_answer` a ON a.`turnId` = t.`id` AND a.`status` IN ('queued', 'generating') WHERE c.`userId` = ? ORDER BY c.`updatedAt` DESC",
      [userId],
    );
    const summaries = new Map<string, ConversationSummary>();
    for (const row of rows) {
      const existing = summaries.get(row.id);
      if (existing) {
        existing.activeAnswerId ??= row.activeAnswerId;
        continue;
      }
      summaries.set(row.id, {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        activeAnswerId: row.activeAnswerId,
        provider: row.provider,
        model: row.model,
      });
    }
    return [...summaries.values()];
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationView> {
    const conversation = await this.ownedConversation(
      this.database,
      userId,
      conversationId,
    );
    const turns = await this.database.query<AssistantTurnRow[]>(
      'SELECT * FROM `assistant_turn` WHERE `conversationId` = ? ORDER BY `createdAt` ASC, `id` ASC',
      [conversationId],
    );
    const answers = await this.database.query<AssistantAnswerRow[]>(
      'SELECT a.* FROM `assistant_answer` a INNER JOIN `assistant_turn` t ON t.`id` = a.`turnId` WHERE t.`conversationId` = ? ORDER BY a.`version` ASC',
      [conversationId],
    );
    const answerViews = new Map<string, AnswerView[]>();
    for (const answer of answers) {
      const versions = answerViews.get(answer.turnId) ?? [];
      versions.push({
        id: answer.id,
        version: answer.version,
        content: answer.content,
        status: answer.status,
        model: answer.model,
        provider: answer.provider,
        errorCode: answer.errorCode,
        createdAt: new Date(answer.createdAt).toISOString(),
      });
      answerViews.set(answer.turnId, versions);
    }
    const activeAnswer = answers.find(
      (answer) => answer.status === 'queued' || answer.status === 'generating',
    );
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString(),
      activeAnswerId: activeAnswer?.id ?? null,
      provider: conversation.provider,
      model: conversation.model,
      turns: turns.map((turn) => ({
        id: turn.id,
        question: turn.question,
        selectedAnswerId: turn.selectedAnswerId,
        createdAt: new Date(turn.createdAt).toISOString(),
        answers: answerViews.get(turn.id) ?? [],
      })),
    };
  }

  async sendQuestion(
    userId: string,
    question: string,
    conversationId?: string,
    requestedModel?: AssistantModelChoice,
    crossProviderConfirmed = false,
  ): Promise<ConversationView> {
    this.generation.requireGenerationReady();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) throw new BadRequestException('Question is required');
    const existingConversation = conversationId
      ? await this.ownedConversation(this.database, userId, conversationId)
      : null;
    const previousModel =
      existingConversation?.provider && existingConversation.model
        ? {
            provider: existingConversation.provider,
            modelId: existingConversation.model,
          }
        : null;
    // AI modified: a generated answer records the account-owned model and Key selected at send time.
    const selection = await this.configuration.chooseModel(
      userId,
      requestedModel,
      previousModel ?? undefined,
    );
    if (
      existingConversation?.provider &&
      existingConversation.provider !== selection.model.provider &&
      !crossProviderConfirmed
    ) {
      throw new ConflictException('cross_provider_confirmation_required');
    }
    const runner = this.database.createQueryRunner();
    await runner.connect();
    let createdConversationId = conversationId;
    const answerId = randomUUID();
    try {
      await runner.startTransaction();
      if (createdConversationId) {
        await this.ownedConversation(runner, userId, createdConversationId);
      } else {
        createdConversationId = randomUUID();
        await runner.query(
          'INSERT INTO `assistant_conversation` (`id`, `userId`, `title`, `provider`, `model`) VALUES (?, ?, ?, ?, ?)',
          [
            createdConversationId,
            userId,
            trimmedQuestion.slice(0, 80),
            selection.model.provider,
            selection.model.modelId,
          ],
        );
      }
      const previousTurns = (await runner.query(
        'SELECT t.`question`, a.`content` AS `answer`, a.`status` FROM `assistant_turn` t LEFT JOIN `assistant_answer` a ON a.`id` = t.`selectedAnswerId` WHERE t.`conversationId` = ? ORDER BY t.`createdAt` ASC, t.`id` ASC',
        [createdConversationId],
      )) as PreviousTurnRow[];
      const context: AssistantModelMessage[] = [];
      for (const turn of previousTurns) {
        context.push({ role: 'user', content: turn.question });
        if (turn.status === 'completed' && turn.answer) {
          context.push({ role: 'assistant', content: turn.answer });
        }
      }
      const turnId = randomUUID();
      await runner.query(
        'INSERT INTO `assistant_turn` (`id`, `conversationId`, `question`, `contextSnapshot`) VALUES (?, ?, ?, ?)',
        [
          turnId,
          createdConversationId,
          trimmedQuestion,
          JSON.stringify(context),
        ],
      );
      await runner.query(
        'INSERT INTO `assistant_answer` (`id`, `turnId`, `userId`, `version`, `content`, `status`, `model`, `provider`, `keyId`) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
        [
          answerId,
          turnId,
          userId,
          '',
          'queued',
          selection.model.modelId,
          selection.model.provider,
          selection.keyId,
        ],
      );
      await runner.query(
        'UPDATE `assistant_conversation` SET `provider` = ?, `model` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ?',
        [
          selection.model.provider,
          selection.model.modelId,
          createdConversationId,
        ],
      );
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('Another answer is already generating');
      }
      throw error;
    } finally {
      await runner.release();
    }
    await this.generation.enqueueAnswer(answerId);
    return this.getConversation(userId, createdConversationId);
  }

  async regenerate(userId: string, turnId: string): Promise<ConversationView> {
    this.generation.requireGenerationReady();
    const runner = this.database.createQueryRunner();
    await runner.connect();
    let conversationId = '';
    const answerId = randomUUID();
    try {
      await runner.startTransaction();
      const turns = (await runner.query(
        'SELECT t.*, c.`userId` FROM `assistant_turn` t INNER JOIN `assistant_conversation` c ON c.`id` = t.`conversationId` WHERE t.`id` = ? LIMIT 1',
        [turnId],
      )) as (AssistantTurnRow & { userId: string })[];
      const turn = turns[0];
      if (!turn || turn.userId !== userId) throw new NotFoundException();
      conversationId = turn.conversationId;
      const conversation = await this.ownedConversation(
        runner,
        userId,
        conversationId,
      );
      const selection = await this.configuration.chooseModel(
        userId,
        undefined,
        conversation.provider && conversation.model
          ? { provider: conversation.provider, modelId: conversation.model }
          : undefined,
      );
      const latestTurns = (await runner.query(
        'SELECT `id` FROM `assistant_turn` WHERE `conversationId` = ? ORDER BY `createdAt` DESC, `id` DESC LIMIT 1',
        [conversationId],
      )) as AssistantTurnRow[];
      if (latestTurns[0]?.id !== turnId) {
        throw new ConflictException(
          'Only the latest answer can be regenerated',
        );
      }
      const versions = (await runner.query(
        'SELECT COALESCE(MAX(`version`), 0) AS `version` FROM `assistant_answer` WHERE `turnId` = ?',
        [turnId],
      )) as VersionRow[];
      await runner.query(
        'INSERT INTO `assistant_answer` (`id`, `turnId`, `userId`, `version`, `content`, `status`, `model`, `provider`, `keyId`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          answerId,
          turnId,
          userId,
          Number(versions[0]?.version ?? 0) + 1,
          '',
          'queued',
          selection.model.modelId,
          selection.model.provider,
          selection.keyId,
        ],
      );
      await runner.query(
        'UPDATE `assistant_conversation` SET `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ?',
        [conversationId],
      );
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('Another answer is already generating');
      }
      throw error;
    } finally {
      await runner.release();
    }
    await this.generation.enqueueAnswer(answerId);
    return this.getConversation(userId, conversationId);
  }

  async selectAnswer(
    userId: string,
    turnId: string,
    answerId: string,
  ): Promise<ConversationView> {
    const turns = await this.database.query<
      (AssistantTurnRow & { userId: string })[]
    >(
      'SELECT t.*, c.`userId` FROM `assistant_turn` t INNER JOIN `assistant_conversation` c ON c.`id` = t.`conversationId` WHERE t.`id` = ? LIMIT 1',
      [turnId],
    );
    const turn = turns[0];
    if (!turn || turn.userId !== userId) throw new NotFoundException();
    const laterTurns = await this.database.query<{ id: string }[]>(
      'SELECT `id` FROM `assistant_turn` WHERE `conversationId` = ? AND (`createdAt` > ? OR (`createdAt` = ? AND `id` > ?)) LIMIT 1',
      [turn.conversationId, turn.createdAt, turn.createdAt, turn.id],
    );
    if (laterTurns.length)
      throw new ConflictException('Earlier answer versions are read-only');
    const answers = await this.database.query<AssistantAnswerRow[]>(
      'SELECT * FROM `assistant_answer` WHERE `id` = ? AND `turnId` = ? AND `status` = ? LIMIT 1',
      [answerId, turnId, 'completed'],
    );
    if (!answers[0])
      throw new BadRequestException('Answer version is unavailable');
    await this.database.query(
      'UPDATE `assistant_turn` SET `selectedAnswerId` = ? WHERE `id` = ?',
      [answerId, turnId],
    );
    return this.getConversation(userId, turn.conversationId);
  }

  async selectModel(
    userId: string,
    conversationId: string,
    model: AssistantModelChoice,
    crossProviderConfirmed = false,
  ): Promise<ConversationView> {
    const conversation = await this.ownedConversation(
      this.database,
      userId,
      conversationId,
    );
    if (
      conversation.provider &&
      conversation.provider !== model.provider &&
      !crossProviderConfirmed
    ) {
      throw new ConflictException('cross_provider_confirmation_required');
    }
    await this.configuration.chooseModel(userId, model);
    await this.database.query(
      'UPDATE `assistant_conversation` SET `provider` = ?, `model` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `userId` = ?',
      [model.provider, model.modelId, conversationId, userId],
    );
    return this.getConversation(userId, conversationId);
  }

  async stopAnswer(
    userId: string,
    answerId: string,
  ): Promise<ConversationView> {
    const answers = await this.database.query<
      (AssistantAnswerRow & { conversationId: string })[]
    >(
      'SELECT a.*, t.`conversationId` FROM `assistant_answer` a INNER JOIN `assistant_turn` t ON t.`id` = a.`turnId` WHERE a.`id` = ? AND a.`userId` = ? LIMIT 1',
      [answerId, userId],
    );
    const answer = answers[0];
    if (!answer) throw new NotFoundException();
    await this.database.query(
      'UPDATE `assistant_answer` SET `status` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `status` IN (?, ?)',
      ['stopped', answerId, 'queued', 'generating'],
    );
    this.cancellation.cancel(answerId);
    return this.getConversation(userId, answer.conversationId);
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<void> {
    await this.ownedConversation(this.database, userId, conversationId);
    await this.database.query(
      'UPDATE `assistant_conversation` SET `title` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `userId` = ?',
      [title.trim(), conversationId, userId],
    );
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.ownedConversation(this.database, userId, conversationId);
    const activeAnswers = await this.database.query<AssistantAnswerRow[]>(
      'SELECT a.* FROM `assistant_answer` a INNER JOIN `assistant_turn` t ON t.`id` = a.`turnId` WHERE t.`conversationId` = ? AND a.`status` IN (?, ?)',
      [conversationId, 'queued', 'generating'],
    );
    for (const answer of activeAnswers) {
      await this.stopAnswer(userId, answer.id);
    }
    await this.database.query(
      'DELETE FROM `assistant_conversation` WHERE `id` = ? AND `userId` = ?',
      [conversationId, userId],
    );
  }

  private async ownedConversation(
    connection: DataSource | QueryRunner,
    userId: string,
    conversationId: string,
  ): Promise<AssistantConversationRow> {
    const conversations = (await connection.query(
      'SELECT * FROM `assistant_conversation` WHERE `id` = ? AND `userId` = ? LIMIT 1',
      [conversationId, userId],
    )) as AssistantConversationRow[];
    if (!conversations[0]) throw new NotFoundException();
    return conversations[0];
  }

  private isDuplicateKey(error: unknown): boolean {
    // AI modified: TypeORM wraps MySQL errors, so inspect both layers before reporting an account-wide generation conflict.
    if (typeof error !== 'object' || error === null) return false;
    const databaseError = error as {
      code?: string;
      driverError?: { code?: string };
    };
    return (
      databaseError.code === 'ER_DUP_ENTRY' ||
      databaseError.driverError?.code === 'ER_DUP_ENTRY'
    );
  }
}
