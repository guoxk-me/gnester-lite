import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';

import { QueueService } from '../../infra/queue/queue.service.js';
import type {
  AssistantGenerationJob,
  AssistantModelMessage,
} from './generation.types.js';
import type { AssistantAnswerRow } from './conversation-persistence.types.js';

// AI modified: the worker owns durable answer transitions without depending on HTTP or conversation views.
export const ASSISTANT_QUEUE = 'assistant-generation';
const ASSISTANT_JOB = 'generate-answer';

export class AssistantCancellation {
  private readonly controllers = new Map<string, AbortController>();

  register(answerId: string, controller: AbortController): void {
    this.controllers.set(answerId, controller);
  }

  cancel(answerId: string): void {
    this.controllers.get(answerId)?.abort();
  }

  release(answerId: string): void {
    this.controllers.delete(answerId);
  }

  cancelAll(): void {
    for (const controller of this.controllers.values()) controller.abort();
  }
}

@Injectable()
export class AssistantGenerationService {
  constructor(
    private readonly database: DataSource,
    private readonly queueService: QueueService,
    @InjectQueue(ASSISTANT_QUEUE)
    private readonly queue: Queue<AssistantGenerationJob>,
  ) {}

  async startAnswer(answerId: string): Promise<{
    messages: AssistantModelMessage[];
    userId: string;
    provider: 'deepseek' | 'openai';
    model: string;
    keyId: string | null;
  } | null> {
    const answers = await this.database.query<
      (AssistantAnswerRow & { question: string; contextSnapshot: string })[]
    >(
      'SELECT a.*, t.`question`, t.`contextSnapshot` FROM `assistant_answer` a INNER JOIN `assistant_turn` t ON t.`id` = a.`turnId` WHERE a.`id` = ? LIMIT 1',
      [answerId],
    );
    const answer = answers[0];
    if (!answer || answer.status !== 'queued') return null;
    if (!answer.provider) {
      await this.failAnswer(answerId, 'model_unavailable');
      return null;
    }
    // AI modified: queued work is admitted under the same owner lock as model switches and Key revocation.
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query('SELECT `id` FROM `user` WHERE `id` = ? FOR UPDATE', [
        answer.userId,
      ]);
      await runner.query(
        'UPDATE `assistant_answer` a INNER JOIN `assistant_key` k ON k.`id` = a.`keyId` AND k.`userId` = a.`userId` LEFT JOIN `assistant_model_preference` p ON p.`userId` = a.`userId` AND p.`provider` = a.`provider` AND p.`modelId` = a.`model` SET a.`status` = ?, a.`updatedAt` = CURRENT_TIMESTAMP(3) WHERE a.`id` = ? AND a.`status` = ? AND k.`isEnabled` = 1 AND k.`isPendingDeletion` = 0 AND COALESCE(p.`isEnabled`, 1) = 1',
        ['generating', answerId, 'queued'],
      );
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    if (!(await this.isGenerating(answerId))) {
      await this.failAnswer(answerId, 'model_unavailable');
      return null;
    }
    const previousMessages = JSON.parse(
      answer.contextSnapshot,
    ) as AssistantModelMessage[];
    return {
      messages: [
        ...previousMessages,
        { role: 'user', content: answer.question },
      ],
      userId: answer.userId,
      provider: answer.provider,
      model: answer.model,
      keyId: answer.keyId,
    };
  }

  async useAnswerKey(answerId: string, keyId: string): Promise<boolean> {
    const answers = await this.database.query<
      Pick<AssistantAnswerRow, 'userId'>[]
    >('SELECT `userId` FROM `assistant_answer` WHERE `id` = ?', [answerId]);
    if (!answers[0]) return false;
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query('SELECT `id` FROM `user` WHERE `id` = ? FOR UPDATE', [
        answers[0].userId,
      ]);
      // AI modified: an emergency-revoked or stopped answer cannot reserve a backup and send again.
      const update = (await runner.query(
        'UPDATE `assistant_answer` a INNER JOIN `assistant_key` k ON k.`userId` = a.`userId` AND k.`id` = ? SET a.`keyId` = ? WHERE a.`id` = ? AND a.`status` = ? AND k.`isEnabled` = 1 AND k.`isPendingDeletion` = 0 AND k.`provider` = a.`provider`',
        [keyId, keyId, answerId, 'generating'],
      )) as unknown as { affectedRows: number };
      await runner.commitTransaction();
      return update.affectedRows === 1;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async isGenerating(answerId: string): Promise<boolean> {
    const answers = await this.database.query<
      Pick<AssistantAnswerRow, 'status'>[]
    >('SELECT `status` FROM `assistant_answer` WHERE `id` = ? LIMIT 1', [
      answerId,
    ]);
    return answers[0]?.status === 'generating';
  }

  async appendAnswer(answerId: string, content: string): Promise<void> {
    await this.database.query(
      'UPDATE `assistant_answer` SET `content` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `status` = ?',
      [content, answerId, 'generating'],
    );
  }

  async completeAnswer(answerId: string, content: string): Promise<void> {
    await this.database.query(
      'UPDATE `assistant_answer` SET `content` = ?, `status` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `status` = ?',
      [content, 'completed', answerId, 'generating'],
    );
    await this.database.query(
      'UPDATE `assistant_turn` t INNER JOIN `assistant_answer` a ON a.`turnId` = t.`id` SET t.`selectedAnswerId` = a.`id` WHERE a.`id` = ? AND a.`status` = ?',
      [answerId, 'completed'],
    );
  }

  async failAnswer(answerId: string, errorCode: string): Promise<void> {
    await this.database.query(
      'UPDATE `assistant_answer` SET `status` = ?, `errorCode` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ? AND `status` IN (?, ?)',
      ['failed', errorCode, answerId, 'queued', 'generating'],
    );
  }

  async failInterruptedAnswers(): Promise<void> {
    // AI modified: an interrupted single-instance worker leaves partial text readable and retryable.
    await this.database.query(
      'UPDATE `assistant_answer` SET `status` = ?, `errorCode` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `status` = ?',
      ['failed', 'interrupted', 'generating'],
    );
  }

  async enqueueAnswer(answerId: string): Promise<void> {
    try {
      await this.queueService.add(
        this.queue,
        ASSISTANT_JOB,
        { answerId },
        {
          jobId: answerId,
          attempts: 1,
        },
      );
    } catch {
      await this.failAnswer(answerId, 'queue_unavailable');
    }
  }

  requireGenerationReady(): void {
    if (!this.queueService.isEnabled()) {
      throw new ServiceUnavailableException('Assistant queue is disabled');
    }
  }
}
