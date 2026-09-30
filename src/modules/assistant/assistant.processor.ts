import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { streamText } from 'ai';
import { Worker, type Job } from 'bullmq';

import { AssistantProviderService } from './assistant-provider.service.js';
import type { AssistantGenerationJob } from './generation.types.js';
import { getQueueWorkerConnectionOptions } from '../../infra/queue/queue-connection.js';
import {
  ASSISTANT_QUEUE,
  AssistantCancellation,
  AssistantGenerationService,
} from './assistant-generation.service.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';

const ASSISTANT_INSTRUCTIONS = [
  '你是后台中的智能助手。用用户所用的语言回答，清楚、准确地帮助通用问答和文字写作。',
  '你无法读取当前后台的实时业务数据，不能联网搜索，也不能执行后台操作。不要暗示自己已读取页面、账号或业务记录。',
  // AI modified: keep the first release's static help factual and separate from live account data.
  '已知静态功能：仪表盘展示示例概况；用户管理页供有权限的管理员查看、筛选、创建用户，管理账号状态和邀请链接。具体可用操作以用户当前页面与权限为准。',
  '当用户询问后台功能而你缺少可信的静态说明时，直接说明无法确认具体功能，不要编造。',
].join('\n');

@Injectable()
export class AssistantProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssistantProcessor.name);
  private worker?: Worker<AssistantGenerationJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly generation: AssistantGenerationService,
    private readonly configuration: AssistantConfigurationService,
    private readonly providers: AssistantProviderService,
    private readonly cancellation: AssistantCancellation,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.getOrThrow<boolean>('queue.enabled')) return;
    await this.generation.failInterruptedAnswers();
    // AI modified: generation runs in BullMQ so closing the browser does not abort the model request.
    this.worker = new Worker<AssistantGenerationJob>(
      ASSISTANT_QUEUE,
      (job) => this.generate(job),
      {
        connection: getQueueWorkerConnectionOptions(
          this.config.getOrThrow<string>('REDIS_URL'),
        ),
        prefix: `${this.config.getOrThrow<string>('queue.prefix')}:${this.config.getOrThrow<string>('NODE_ENV')}`,
        maxStalledCount: 0,
      },
    );
    this.worker.on('error', (error) =>
      this.logger.error('Assistant worker error', error.stack),
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.cancellation.cancelAll();
    await this.worker?.close();
    this.worker = undefined;
  }

  private async generate(job: Job<AssistantGenerationJob>): Promise<void> {
    const { answerId } = job.data;
    const generation = await this.generation.startAnswer(answerId);
    if (!generation) return;
    const controller = new AbortController();
    this.cancellation.register(answerId, controller);
    let content = '';
    let lastCheckpoint = Date.now();
    let keyId = generation.keyId;
    const attemptedKeyIds = new Set<string>();
    try {
      // AI modified: a worker resolves only this answer owner's encrypted Key and retries a backup only for explicit credential failures.
      let key = await this.configuration.generationKey(
        generation.userId,
        { provider: generation.provider, modelId: generation.model },
        keyId,
      );
      if (!key) {
        await this.generation.failAnswer(answerId, 'model_unavailable');
        return;
      }
      while (key) {
        keyId = key.id;
        attemptedKeyIds.add(key.id);
        await this.generation.useAnswerKey(answerId, key.id);
        try {
          const response = streamText({
            model: this.providers.languageModel(
              generation.provider,
              generation.model,
              key.apiKey,
            ),
            system: ASSISTANT_INSTRUCTIONS,
            messages: generation.messages,
            maxOutputTokens: 4096,
            providerOptions:
              generation.provider === 'deepseek'
                ? generation.model === 'deepseek-reasoner'
                  ? undefined
                  : { deepseek: { thinking: { type: 'disabled' } } }
                : { openai: { store: false } },
            abortSignal: controller.signal,
          });
          for await (const delta of response.textStream) {
            content += delta;
            if (Date.now() - lastCheckpoint >= 250) {
              await this.generation.appendAnswer(answerId, content);
              lastCheckpoint = Date.now();
              if (!(await this.generation.isGenerating(answerId))) {
                controller.abort();
                return;
              }
            }
          }
          await this.generation.completeAnswer(answerId, content);
          return;
        } catch (error) {
          if (!content && this.providers.isMissingModelFailure(error)) {
            await this.configuration.retireModel(generation.userId, {
              provider: generation.provider,
              modelId: generation.model,
            });
            await this.generation.failAnswer(answerId, 'model_unavailable');
            return;
          }
          const failure = this.providers.credentialFailure(
            error,
            generation.provider,
          );
          if (!failure || content || controller.signal.aborted) throw error;
          await this.configuration.markKeyFailure(key.id, failure);
          key = await this.configuration.nextGenerationKey(
            generation.userId,
            { provider: generation.provider, modelId: generation.model },
            key.id,
          );
          if (!key) {
            await this.generation.failAnswer(answerId, failure);
            return;
          }
        }
      }
    } catch (error) {
      if (await this.generation.isGenerating(answerId)) {
        await this.generation.failAnswer(answerId, 'model_error');
      }
      if (!controller.signal.aborted) {
        // AI modified: provider errors can contain request details, so logs omit raw error bodies.
        this.logger.warn(
          `Assistant generation failed for answer ${answerId}: ${error instanceof Error ? error.name : 'unknown'}`,
        );
      }
    } finally {
      this.cancellation.release(answerId);
      for (const attemptedKeyId of attemptedKeyIds)
        await this.configuration.finishKeyDeletion(attemptedKeyId);
    }
  }
}
