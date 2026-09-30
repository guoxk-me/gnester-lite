import { ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { DataSource } from 'typeorm';
import type { QueueService } from '../../infra/queue/queue.service.js';
import {
  AssistantCancellation,
  AssistantGenerationService,
} from './assistant-generation.service.js';
import type { AssistantGenerationJob } from './generation.types.js';

// AI modified: extracted generation ownership preserves cancellation, queue failure and durable transition behavior.
describe('assistant generation lifecycle', () => {
  const query = vi.fn();
  const add = vi.fn();
  const isEnabled = vi.fn();
  const queue = {} as Queue<AssistantGenerationJob>;
  const service = new AssistantGenerationService(
    { query } as unknown as DataSource,
    { add, isEnabled } as unknown as QueueService,
    queue,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    query.mockResolvedValue([]);
    add.mockResolvedValue({});
    isEnabled.mockReturnValue(true);
  });

  it('does not restart completed, missing, or concurrently stopped answers', async () => {
    expect(await service.startAnswer('missing')).toBeNull();
    query.mockResolvedValueOnce([{ status: 'completed' }]);
    expect(await service.startAnswer('completed')).toBeNull();
    query.mockResolvedValueOnce([{ status: 'queued', provider: 'deepseek' }]);
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([{ status: 'stopped' }]);
    expect(await service.startAnswer('stopped')).toBeNull();
  });

  it('restores the saved context only for an answer admitted to generation', async () => {
    query.mockResolvedValueOnce([
      {
        status: 'queued',
        userId: 'owner',
        provider: 'deepseek',
        model: 'deepseek-chat',
        keyId: 'owner-key',
        question: 'Continue',
        contextSnapshot: JSON.stringify([
          { role: 'assistant', content: 'Earlier' },
        ]),
      },
    ]);
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([{ status: 'generating' }]);
    await expect(service.startAnswer('answer')).resolves.toEqual({
      messages: [
        { role: 'assistant', content: 'Earlier' },
        { role: 'user', content: 'Continue' },
      ],
      userId: 'owner',
      provider: 'deepseek',
      model: 'deepseek-chat',
      keyId: 'owner-key',
    });
  });

  it('fails an unavailable model and an unconfirmed queue publication without leaving an answer queued', async () => {
    query.mockResolvedValueOnce([{ status: 'queued', provider: null }]);
    expect(await service.startAnswer('unavailable')).toBeNull();
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [
      'failed',
      'model_unavailable',
      'unavailable',
      'queued',
      'generating',
    ]);
    add.mockRejectedValueOnce(new Error('Redis disconnected'));
    await service.enqueueAnswer('answer');
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [
      'failed',
      'queue_unavailable',
      'answer',
      'queued',
      'generating',
    ]);
    expect(add).toHaveBeenCalledWith(
      queue,
      'generate-answer',
      { answerId: 'answer' },
      { jobId: 'answer', attempts: 1 },
    );
    isEnabled.mockReturnValue(false);
    expect(() => service.requireGenerationReady()).toThrow(
      ServiceUnavailableException,
    );
    isEnabled.mockReturnValue(true);
    expect(() => service.requireGenerationReady()).not.toThrow();
  });

  it('keeps partial content durable and selects only completed answers', async () => {
    await service.useAnswerKey('answer', 'key');
    await service.appendAnswer('answer', 'Partial');
    await service.completeAnswer('answer', 'Complete');
    expect(query.mock.calls.map((call) => call[1])).toEqual([
      ['key', 'answer', 'generating'],
      ['Partial', 'answer', 'generating'],
      ['Complete', 'completed', 'answer', 'generating'],
      ['answer', 'completed'],
    ]);
    await service.failInterruptedAnswers();
    expect(query).toHaveBeenLastCalledWith(expect.any(String), [
      'failed',
      'interrupted',
      'generating',
    ]);
  });

  it('cancels active controllers and releases finished answers', () => {
    const cancellation = new AssistantCancellation();
    const first = new AbortController();
    const second = new AbortController();
    cancellation.register('first', first);
    cancellation.register('second', second);
    cancellation.release('first');
    cancellation.cancel('first');
    expect(first.signal.aborted).toBe(false);
    cancellation.cancel('missing');
    cancellation.cancelAll();
    expect(second.signal.aborted).toBe(true);
    const third = new AbortController();
    cancellation.register('third', third);
    cancellation.cancel('third');
    expect(third.signal.aborted).toBe(true);
  });
});
