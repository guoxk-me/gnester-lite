import { ConflictException, NotFoundException } from '@nestjs/common';

import type { Queue } from 'bullmq';
import type { DataSource, QueryRunner } from 'typeorm';

import {
  AssistantCancellation,
  AssistantGenerationService,
} from './assistant-generation.service.js';
import type { AssistantGenerationJob } from './generation.types.js';
import type { QueueService } from '../../infra/queue/queue.service.js';
import { AssistantService } from './assistant.service.js';
import type { AssistantConfigurationService } from './assistant-configuration.service.js';

describe('AssistantService', () => {
  const query = vi.fn<(...args: [string, unknown[]?]) => Promise<unknown>>();
  const runnerQuery =
    vi.fn<(...args: [string, unknown[]?]) => Promise<unknown>>();
  const rollbackTransaction = vi.fn().mockResolvedValue(undefined);
  const commitTransaction = vi.fn().mockResolvedValue(undefined);
  const connect = vi.fn().mockResolvedValue(undefined);
  const runner = {
    connect,
    startTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction,
    rollbackTransaction,
    release: vi.fn().mockResolvedValue(undefined),
    query: runnerQuery,
    isTransactionActive: true,
  } as unknown as QueryRunner;
  const database = {
    query,
    createQueryRunner: () => runner,
  } as unknown as DataSource;
  const chooseModel = vi.fn().mockResolvedValue({
    model: { provider: 'deepseek', modelId: 'deepseek-flash' },
    keyId: 'key-1',
  });
  const configuration = {
    chooseModel,
  } as unknown as AssistantConfigurationService;
  const queueService = {
    isEnabled: () => true,
    add: vi.fn().mockResolvedValue(undefined),
  } as unknown as QueueService;
  const generation = new AssistantGenerationService(
    database,
    queueService,
    {} as Queue<AssistantGenerationJob>,
  );
  const cancellation = new AssistantCancellation();
  const service = new AssistantService(
    database,
    configuration,
    generation,
    cancellation,
  );

  beforeEach(() => {
    query.mockReset();
    runnerQuery.mockReset();
    vi.clearAllMocks();
  });

  it('does not reveal another account conversation', async () => {
    query.mockResolvedValueOnce([]);
    await expect(
      service.getConversation('user-1', 'other-conversation'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('turns a wrapped MySQL active-user collision into a generation conflict', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'conversation-1',
        userId: 'user-1',
        provider: 'deepseek',
        model: 'deepseek-flash',
      },
    ]);
    runnerQuery
      .mockResolvedValueOnce([{ id: 'conversation-1', userId: 'user-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ driverError: { code: 'ER_DUP_ENTRY' } });
    await expect(
      service.sendQuestion('user-1', 'hello', 'conversation-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(commitTransaction).not.toHaveBeenCalled();
  });

  it('requires confirmation before sending old context to another provider', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'conversation-1',
        userId: 'user-1',
        provider: 'deepseek',
        model: 'deepseek-flash',
      },
    ]);
    chooseModel.mockResolvedValueOnce({
      model: { provider: 'openai', modelId: 'gpt-4o-mini' },
      keyId: 'key-2',
    });
    await expect(
      service.sendQuestion('user-1', 'continue', 'conversation-1', {
        provider: 'openai',
        modelId: 'gpt-4o-mini',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(connect).not.toHaveBeenCalled();
  });
});
