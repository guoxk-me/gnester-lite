import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { UserManagementService } from '../../src/modules/identity/user-management.service.js';
import { AssistantConfigurationService } from '../../src/modules/assistant/assistant-configuration.service.js';
import { AssistantProviderService } from '../../src/modules/assistant/assistant-provider.service.js';
import { AssistantProcessor } from '../../src/modules/assistant/assistant.processor.js';
import { AssistantService } from '../../src/modules/assistant/assistant.service.js';
import {
  AssistantCancellation,
  AssistantGenerationService,
  ASSISTANT_QUEUE,
} from '../../src/modules/assistant/assistant-generation.service.js';

// AI modified: exercise transactions and cancellation against disposable MySQL/Redis while provider responses stay inert.
if (
  process.env.GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION !== 'true' ||
  !/(?:_|-)(?:test|ci)$/.test(process.env.DB_DATABASE ?? '') ||
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST ?? '')
) {
  throw new Error(
    'Assistant integration requires explicitly authorized disposable loopback infrastructure.',
  );
}

describe('personal configuration transactions and revocation', () => {
  let app: NestExpressApplication;
  let database: DataSource;
  let configuration: AssistantConfigurationService;
  let generation: AssistantGenerationService;
  let conversations: AssistantService;
  let cancellation: AssistantCancellation;
  let queue: Queue;
  let ownerId: string;
  let otherId: string;
  let keyId: string;
  const createdUsers: string[] = [];
  const deepseek = { provider: 'deepseek' as const, modelId: 'deepseek-chat' };
  const openai = { provider: 'openai' as const, modelId: 'gpt-4o-mini' };
  const providers = {
    readCatalog: vi.fn(async (provider: string) => [
      { id: provider === 'deepseek' ? deepseek.modelId : openai.modelId },
    ]),
    verifyTextGeneration: vi.fn(async () => undefined),
    readBalance: vi.fn(async () => ({
      status: 'unsupported',
      balances: [],
      checkedAt: new Date().toISOString(),
    })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AssistantProcessor)
      .useValue({})
      .overrideProvider(AssistantProviderService)
      .useValue(providers)
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    await configureApplication(app);
    await app.listen(0, '127.0.0.1');
    database = app.get(DataSource);
    configuration = app.get(AssistantConfigurationService);
    generation = app.get(AssistantGenerationService);
    conversations = app.get(AssistantService);
    cancellation = app.get(AssistantCancellation);
    queue = app.get<Queue>(getQueueToken(ASSISTANT_QUEUE));
    await queue.pause();
  }, 30000);

  beforeEach(async () => {
    const users = app.get(UserManagementService);
    ownerId = (
      await users.createUser(
        'Configuration owner',
        `${randomUUID()}@example.com`,
        randomUUID(),
      )
    ).id;
    otherId = (
      await users.createUser(
        'Other owner',
        `${randomUUID()}@example.com`,
        randomUUID(),
      )
    ).id;
    createdUsers.push(ownerId, otherId);
    const configurationAfterKey = await configuration.saveKey(
      ownerId,
      'deepseek',
      'Primary',
      'acceptance-fixture-primary',
    );
    keyId = configurationAfterKey.keys[0]!.id;
    await configuration.saveKey(
      ownerId,
      'deepseek',
      'Backup',
      'acceptance-fixture-backup',
    );
    await configuration.saveKey(
      ownerId,
      'openai',
      'OpenAI',
      'acceptance-fixture-openai',
    );
    await configuration.saveKey(
      otherId,
      'deepseek',
      'Other',
      'acceptance-fixture-other',
    );
  });

  afterAll(async () => {
    try {
      if (database)
        for (const userId of createdUsers)
          await database.query('DELETE FROM `user` WHERE `id` = ?', [userId]);
      await queue?.resume();
    } finally {
      await app?.close();
    }
  });

  it('rolls back a default switch without a replacement, persists successful switches across sync, and isolates owners', async () => {
    await expect(
      configuration.updateModel(ownerId, {
        ...deepseek,
        isEnabled: false,
        defaultModel: deepseek,
        backupModels: [],
      }),
    ).rejects.toThrow('Default model is unavailable');
    expect(
      (await configuration.getConfiguration(ownerId)).models.find(
        (model) => model.provider === 'deepseek',
      )?.isEnabled,
    ).toBe(true);
    await configuration.updateModel(ownerId, {
      ...deepseek,
      isEnabled: false,
      defaultModel: openai,
      backupModels: [],
    });
    await configuration.refreshModels(ownerId, keyId);
    expect(
      (await configuration.getConfiguration(ownerId)).models.find(
        (model) => model.provider === 'deepseek',
      ),
    ).toMatchObject({
      isEnabled: false,
      isAvailable: false,
      reason: 'disabled',
    });
    expect(
      (await configuration.getConfiguration(otherId)).models[0],
    ).toMatchObject({ isEnabled: true, isAvailable: true });
    await expect(configuration.chooseModel(ownerId, deepseek)).rejects.toThrow(
      'model_unavailable',
    );
  });

  it('stops queued model work while allowing an admitted answer to finish', async () => {
    const pending = await conversations.sendQuestion(
      ownerId,
      'Queued fixture',
      undefined,
      deepseek,
    );
    await configuration.updateModel(ownerId, {
      ...deepseek,
      isEnabled: false,
      defaultModel: openai,
      backupModels: [],
    });
    expect(await generation.startAnswer(pending.activeAnswerId!)).toBeNull();
    await configuration.updateModel(ownerId, {
      ...deepseek,
      isEnabled: true,
      defaultModel: deepseek,
      backupModels: [],
    });
    const running = await conversations.sendQuestion(
      ownerId,
      'Running fixture',
      undefined,
      deepseek,
    );
    expect(
      await generation.startAnswer(running.activeAnswerId!),
    ).not.toBeNull();
    await configuration.updateModel(ownerId, {
      ...deepseek,
      isEnabled: false,
      defaultModel: openai,
      backupModels: [],
    });
    expect(await generation.isGenerating(running.activeAnswerId!)).toBe(true);
    await generation.completeAnswer(
      running.activeAnswerId!,
      'Finished fixture',
    );
    expect(
      (await conversations.getConversation(ownerId, running.id)).turns[0]
        ?.answers[0]?.status,
    ).toBe('completed');
  });

  it('revokes an active Key, aborts its controller, preserves partial text, and prevents fallback or re-enabling', async () => {
    const view = await conversations.sendQuestion(
      ownerId,
      'Revocation fixture',
      undefined,
      deepseek,
    );
    const answerId = view.activeAnswerId!;
    expect(await generation.startAnswer(answerId)).not.toBeNull();
    expect(await generation.useAnswerKey(answerId, keyId)).toBe(true);
    await generation.appendAnswer(answerId, 'Partial fixture');
    const controller = new AbortController();
    cancellation.register(answerId, controller);
    await expect(configuration.revokeKey(otherId, keyId)).rejects.toThrow();
    expect(controller.signal.aborted).toBe(false);
    const afterRevocation = await configuration.revokeKey(ownerId, keyId);
    expect(controller.signal.aborted).toBe(true);
    expect(afterRevocation.keys.some((key) => key.id === keyId)).toBe(false);
    expect(
      await generation.useAnswerKey(
        answerId,
        afterRevocation.keys.find((key) => key.provider === 'deepseek')!.id,
      ),
    ).toBe(false);
    expect(
      (await conversations.getConversation(ownerId, view.id)).turns[0]
        ?.answers[0],
    ).toMatchObject({
      status: 'stopped',
      content: 'Partial fixture',
      errorCode: 'key_revoked',
    });
    await expect(
      configuration.updateKey(ownerId, keyId, { isEnabled: true }),
    ).rejects.toThrow();
    const stored = await database.query<{ id: string }[]>(
      'SELECT `id` FROM `assistant_key` WHERE `id` = ?',
      [keyId],
    );
    expect(stored).toHaveLength(0);
    cancellation.release(answerId);
  });

  it('rechecks a selection under the publication lock after its Key was revoked', async () => {
    const selection = await configuration.chooseModel(ownerId, deepseek);
    await configuration.revokeKey(ownerId, selection.keyId);
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query('SELECT `id` FROM `user` WHERE `id` = ? FOR UPDATE', [
        ownerId,
      ]);
      await expect(
        configuration.requireSelectedKey(
          runner,
          ownerId,
          selection.model,
          selection.keyId,
        ),
      ).rejects.toThrow('model_unavailable');
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
  });

  it('serializes simultaneous publication and revocation without leaving revoked work active', async () => {
    const [sent, revoked] = await Promise.allSettled([
      conversations.sendQuestion(
        ownerId,
        'Concurrent revocation fixture',
        undefined,
        deepseek,
      ),
      configuration.revokeKey(ownerId, keyId),
    ]);
    expect(revoked.status).toBe('fulfilled');
    const active = await database.query<{ id: string }[]>(
      'SELECT `id` FROM `assistant_answer` WHERE `userId` = ? AND `keyId` = ? AND `status` IN (?, ?)',
      [ownerId, keyId, 'queued', 'generating'],
    );
    expect(active).toHaveLength(0);
    if (sent.status === 'fulfilled') {
      expect(
        await generation.startAnswer(sent.value.activeAnswerId!),
      ).toBeNull();
    } else {
      expect(sent.reason).toBeInstanceOf(Error);
    }
  });

  it('persists only safe audit fields and protects the new HTTP endpoints with session authentication', async () => {
    await configuration.savePreferences(ownerId, deepseek, []);
    await configuration.consentToOpenAi(ownerId);
    await expect(configuration.revokeKey(otherId, keyId)).rejects.toThrow();
    const audits = await database.query<Record<string, unknown>[]>(
      'SELECT * FROM `assistant_configuration_audit` WHERE `userId` IN (?, ?) ORDER BY `createdAt`',
      [ownerId, otherId],
    );
    expect(
      audits.some(
        (event) =>
          event.action === 'preferences_updated' && event.outcome === 'success',
      ),
    ).toBe(true);
    expect(
      audits.some(
        (event) => event.action === 'key_revoked' && event.outcome === 'denied',
      ),
    ).toBe(true);
    expect(JSON.stringify(audits)).not.toContain('acceptance-fixture');
    for (const event of audits)
      expect(Object.keys(event)).toEqual(
        expect.arrayContaining([
          'userId',
          'action',
          'targetId',
          'outcome',
          'createdAt',
        ]),
      );
    const visitor = request.agent(app.getHttpServer());
    const session = await visitor.get('/api/session').expect(401);
    const cookies = (session.headers['set-cookie'] ??
      []) as unknown as string[];
    // AI modified: the guarded full-app runner disables CSRF; direct browser-bound runs still send its issued token.
    const csrfCookie = cookies.find((cookie) =>
      cookie.startsWith('XSRF-TOKEN='),
    );
    const csrfHeaders = csrfCookie
      ? {
          'X-XSRF-TOKEN': decodeURIComponent(
            csrfCookie.split(';')[0]!.slice('XSRF-TOKEN='.length),
          ),
        }
      : {};
    await visitor
      .patch('/api/assistant/models')
      .set(csrfHeaders)
      .send({
        ...deepseek,
        isEnabled: false,
        defaultModel: null,
        backupModels: [],
      })
      .expect(401);
    await visitor
      .post(`/api/assistant/keys/${keyId}/revoke`)
      .set(csrfHeaders)
      .expect(401);
  });

  it('rolls back Key and default changes when their success audit cannot be persisted', async () => {
    // AI modified: inject the persistence fault after default repair, while MySQL still owns the real transaction.
    await configuration.savePreferences(ownerId, openai, [deepseek]);
    const before = await configuration.getConfiguration(ownerId);
    const openaiKey = before.keys.find((key) => key.provider === 'openai')!;
    const createTransaction = database.createQueryRunner.bind(database);
    const restoreQueries: Array<() => void> = [];
    const transaction = vi
      .spyOn(database, 'createQueryRunner')
      .mockImplementation((mode) => {
        const runner = createTransaction(mode);
        const executeQuery = runner.query.bind(runner);
        const auditInsert = vi
          .spyOn(runner, 'query')
          .mockImplementation(async (...arguments_) => {
            if (
              runner.isTransactionActive &&
              arguments_[0].startsWith(
                'INSERT INTO `assistant_configuration_audit`',
              )
            ) {
              throw new Error('Simulated audit storage failure');
            }
            return executeQuery(...arguments_);
          });
        restoreQueries.push(() => auditInsert.mockRestore());
        return runner;
      });
    try {
      await expect(
        configuration.updateKey(ownerId, openaiKey.id, { isEnabled: false }),
      ).rejects.toThrow('Simulated audit storage failure');
      const after = await configuration.getConfiguration(ownerId);
      expect(after.keys.find((key) => key.id === openaiKey.id)?.isEnabled).toBe(
        true,
      );
      expect(after.defaultModel).toEqual(openai);
      expect(after.backupModels).toEqual([deepseek]);
    } finally {
      for (const restoreQuery of restoreQueries) restoreQuery();
      transaction.mockRestore();
    }
  });

  it('records a rejected candidate without storing the Key or replacing a working connection', async () => {
    const before = await configuration.getConfiguration(ownerId);
    providers.verifyTextGeneration.mockRejectedValueOnce(
      new Error('acceptance-fixture-rejected-secret'),
    );
    await expect(
      configuration.saveKey(
        ownerId,
        'deepseek',
        'Rejected replacement',
        'acceptance-fixture-rejected-secret',
        keyId,
      ),
    ).rejects.toThrow('API Key validation failed');
    expect((await configuration.getConfiguration(ownerId)).keys).toEqual(
      before.keys,
    );
    const events = await database.query<Record<string, unknown>[]>(
      'SELECT * FROM `assistant_configuration_audit` WHERE `userId` = ? AND `action` = ?',
      [ownerId, 'key_replaced'],
    );
    expect(events.some((event) => event.outcome === 'failed')).toBe(true);
    expect(JSON.stringify(events)).not.toContain(
      'acceptance-fixture-rejected-secret',
    );
  });
});
