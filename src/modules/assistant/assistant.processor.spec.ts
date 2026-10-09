import { ConfigService } from '@nestjs/config';
import { streamText } from 'ai';
import type { Job } from 'bullmq';
import { AssistantProcessor } from './assistant.processor.js';
import {
  AssistantCancellation,
  type AssistantGenerationService,
} from './assistant-generation.service.js';
import type { AssistantConfigurationService } from './assistant-configuration.service.js';
import type { AssistantProviderService } from './assistant-provider.service.js';
import type { AssistantGenerationJob } from './generation.types.js';

const worker = vi.hoisted(() => ({
  consume: undefined as
    ((job: Job<AssistantGenerationJob>) => Promise<void>) | undefined,
  close: vi.fn(),
}));
vi.mock('bullmq', async () => ({
  ...(await vi.importActual<typeof import('bullmq')>('bullmq')),
  Worker: class {
    constructor(
      _queue: string,
      consume: (job: Job<AssistantGenerationJob>) => Promise<void>,
    ) {
      worker.consume = consume;
    }
    on(): void {}
    close = worker.close;
  },
}));
vi.mock('ai', () => ({ streamText: vi.fn() }));

// AI modified: worker coordination is exercised through its queue callback with inert Redis and provider boundaries.
describe('assistant worker composition', () => {
  const config = {
    'queue.enabled': true,
    'queue.prefix': 'test',
    NODE_ENV: 'test',
    REDIS_URL: 'redis://127.0.0.1:6379',
  };
  const generation = {
    failInterruptedAnswers: vi.fn(),
    startAnswer: vi.fn(),
    useAnswerKey: vi.fn(),
    completeAnswer: vi.fn(),
    failAnswer: vi.fn(),
    isGenerating: vi.fn(),
  };
  const configuration = { generationKey: vi.fn(), finishKeyDeletion: vi.fn() };
  const providers = { languageModel: vi.fn() };
  let cancellation: AssistantCancellation;
  let processor: AssistantProcessor;
  beforeEach(() => {
    vi.resetAllMocks();
    generation.useAnswerKey.mockResolvedValue(true);
    generation.isGenerating.mockResolvedValue(true);
    worker.consume = undefined;
    config['queue.enabled'] = true;
    cancellation = new AssistantCancellation();
    processor = new AssistantProcessor(
      {
        getOrThrow: (name: keyof typeof config) => config[name],
      } as unknown as ConfigService,
      generation as unknown as AssistantGenerationService,
      configuration as unknown as AssistantConfigurationService,
      providers as unknown as AssistantProviderService,
      cancellation,
    );
  });

  it('does not start a worker while the queue is disabled', async () => {
    config['queue.enabled'] = false;
    await processor.onModuleInit();
    expect(generation.failInterruptedAnswers).not.toHaveBeenCalled();
    expect(worker.consume).toBeUndefined();
    await processor.onModuleDestroy();
  });

  it('generates with the answer owner and completes through the durable service', async () => {
    generation.startAnswer.mockResolvedValue({
      userId: 'owner',
      provider: 'openai',
      model: 'gpt-4o',
      keyId: null,
      messages: [{ role: 'user', content: 'Question' }],
    });
    configuration.generationKey.mockResolvedValue({
      id: 'owner-key',
      apiKey: 'fixture-key',
    });
    vi.mocked(streamText).mockReturnValue({
      fullStream: (async function* () {
        yield { type: 'text-delta', text: 'Hello' };
        yield { type: 'text-delta', text: ' world' };
      })(),
    } as unknown as ReturnType<typeof streamText>);
    await processor.onModuleInit();
    expect(generation.failInterruptedAnswers).toHaveBeenCalledOnce();
    if (!worker.consume) throw new Error('Worker callback was not registered');
    await worker.consume({
      data: { answerId: 'answer' },
    } as Job<AssistantGenerationJob>);
    expect(configuration.generationKey).toHaveBeenCalledWith(
      'owner',
      { provider: 'openai', modelId: 'gpt-4o' },
      null,
    );
    expect(providers.languageModel).toHaveBeenCalledWith(
      'openai',
      'gpt-4o',
      'fixture-key',
    );
    expect(generation.completeAnswer).toHaveBeenCalledWith(
      'answer',
      'Hello world',
    );
    expect(configuration.finishKeyDeletion).toHaveBeenCalledWith('owner-key');
    const controller = new AbortController();
    cancellation.register('active', controller);
    await processor.onModuleDestroy();
    expect(controller.signal.aborted).toBe(true);
    expect(worker.close).toHaveBeenCalledOnce();
  });

  it('does not contact a model when no owned credential is available', async () => {
    generation.startAnswer.mockResolvedValue({
      userId: 'owner',
      provider: 'openai',
      model: 'gpt-4o',
      keyId: null,
      messages: [],
    });
    configuration.generationKey.mockResolvedValue(null);
    await processor.onModuleInit();
    if (!worker.consume) throw new Error('Worker callback was not registered');
    await worker.consume({
      data: { answerId: 'answer' },
    } as Job<AssistantGenerationJob>);
    expect(generation.failAnswer).toHaveBeenCalledWith(
      'answer',
      'model_unavailable',
    );
    expect(streamText).not.toHaveBeenCalled();
    await processor.onModuleDestroy();
  });

  it('does not send or switch to a backup after the selected answer was revoked', async () => {
    generation.startAnswer.mockResolvedValue({
      userId: 'owner',
      provider: 'deepseek',
      model: 'deepseek-chat',
      keyId: 'removed-key',
      messages: [],
    });
    configuration.generationKey.mockResolvedValue({
      id: 'backup-key',
      apiKey: 'fixture-key',
    });
    generation.useAnswerKey.mockResolvedValue(false);
    await processor.onModuleInit();
    if (!worker.consume) throw new Error('Worker callback was not registered');
    await worker.consume({
      data: { answerId: 'answer' },
    } as Job<AssistantGenerationJob>);
    expect(streamText).not.toHaveBeenCalled();
    expect(providers.languageModel).not.toHaveBeenCalled();
    expect(generation.completeAnswer).not.toHaveBeenCalled();
  });

  it('marks an SDK error event as failed instead of completing an empty answer', async () => {
    generation.startAnswer.mockResolvedValue({
      userId: 'owner',
      provider: 'openai',
      model: 'gpt-4o',
      keyId: 'owner-key',
      messages: [],
    });
    configuration.generationKey.mockResolvedValue({
      id: 'owner-key',
      apiKey: 'fixture-key',
    });
    Object.assign(providers, {
      credentialFailure: vi.fn().mockReturnValue(null),
      isMissingModelFailure: vi.fn().mockReturnValue(false),
    });
    vi.mocked(streamText).mockReturnValue({
      fullStream: (async function* () {
        yield { type: 'error', error: new Error('Fixture upstream failure') };
      })(),
    } as unknown as ReturnType<typeof streamText>);
    await processor.onModuleInit();
    if (!worker.consume) throw new Error('Worker callback was not registered');
    await worker.consume({
      data: { answerId: 'answer' },
    } as Job<AssistantGenerationJob>);
    expect(generation.failAnswer).toHaveBeenCalledWith('answer', 'model_error');
    expect(generation.completeAnswer).not.toHaveBeenCalled();
  });
});
