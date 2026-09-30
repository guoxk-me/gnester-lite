import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type LanguageModel } from 'ai';

import type { AssistantProvider } from './model.types.js';
import type {
  CatalogModel,
  CatalogResponse,
  BalanceResponse,
} from './provider-protocol.types.js';

// AI modified: a listed model must also be known to accept text and produce text.
export function isTextModel(
  provider: AssistantProvider,
  model: CatalogModel,
): boolean {
  if (provider === 'deepseek') {
    if (model.input_modalities && model.output_modalities)
      return (
        model.input_modalities.includes('text') &&
        model.output_modalities.includes('text')
      );
    return /^(?:deepseek-chat|deepseek-reasoner|deepseek-flash)$/.test(
      model.id,
    );
  }
  return (
    /^(?:gpt-[4-9]|o[1-9](?:[.-]|$))/.test(model.id) &&
    !/(?:audio|realtime|image|transcrib|tts|embedding|moderation|search)/i.test(
      model.id,
    )
  );
}

// AI modified: official provider protocols stay separate from credential persistence and model-selection rules.
@Injectable()
export class AssistantProviderService {
  languageModel(
    provider: AssistantProvider,
    modelId: string,
    apiKey: string,
  ): LanguageModel {
    return provider === 'deepseek'
      ? createDeepSeek({ apiKey })(modelId)
      : createOpenAI({ apiKey })(modelId);
  }

  async verifyTextGeneration(
    provider: AssistantProvider,
    modelId: string,
    apiKey: string,
  ): Promise<void> {
    await generateText({
      model: this.languageModel(provider, modelId, apiKey),
      prompt: 'Reply with OK.',
      maxOutputTokens: 16,
      ...(provider === 'deepseek' && modelId !== 'deepseek-reasoner'
        ? { providerOptions: { deepseek: { thinking: { type: 'disabled' } } } }
        : provider === 'openai'
          ? { providerOptions: { openai: { store: false } } }
          : {}),
    });
  }

  credentialFailure(
    error: unknown,
    provider: AssistantProvider,
  ): 'key_invalid' | 'quota_exhausted' | null {
    if (!error || typeof error !== 'object') return null;
    const candidate = error as { statusCode?: unknown; responseBody?: unknown };
    const errorCode = this.providerErrorCode(candidate.responseBody);
    if (
      [
        'insufficient_quota',
        'billing_hard_limit_reached',
        'insufficient_balance',
      ].includes(errorCode)
    )
      return 'quota_exhausted';
    if (['invalid_api_key', 'authentication_error'].includes(errorCode))
      return 'key_invalid';
    // DeepSeek documents 402 as insufficient balance; generic 429 remains a rate limit.
    if (provider === 'deepseek' && candidate.statusCode === 402)
      return 'quota_exhausted';
    if (candidate.statusCode === 401) return 'key_invalid';
    return null;
  }

  isMissingModelFailure(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { responseBody?: unknown };
    return ['model_not_found', 'model_not_exist', 'invalid_model'].includes(
      this.providerErrorCode(candidate.responseBody),
    );
  }

  private providerErrorCode(responseBody: unknown): string {
    if (typeof responseBody !== 'string') return '';
    try {
      const body = JSON.parse(responseBody) as {
        error?: { code?: unknown; type?: unknown };
      };
      const code = body.error?.code ?? body.error?.type;
      return typeof code === 'string' ? code : '';
    } catch {
      return '';
    }
  }

  async readCatalog(
    provider: AssistantProvider,
    apiKey: string,
  ): Promise<CatalogModel[]> {
    const url =
      provider === 'deepseek'
        ? 'https://api.deepseek.com/models'
        : 'https://api.openai.com/v1/models';
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ServiceUnavailableException('Model catalog is unavailable');
    }
    if (!response.ok)
      throw new BadRequestException(
        'API Key cannot read the official model catalog',
      );
    const catalog = (await response.json()) as CatalogResponse;
    if (!Array.isArray(catalog.data))
      throw new ServiceUnavailableException('Invalid model catalog');
    return catalog.data.filter(
      (model) => typeof model.id === 'string' && model.id.length <= 100,
    );
  }
  async readBalance(
    provider: AssistantProvider,
    apiKey: string,
  ): Promise<{
    status: 'available' | 'unsupported' | 'unavailable';
    balances: { currency: string; amount: string }[];
    checkedAt: string;
  }> {
    const checkedAt = new Date().toISOString();
    if (provider === 'openai')
      return { status: 'unsupported', balances: [], checkedAt };
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Balance read failed');
      const balance = (await response.json()) as BalanceResponse;
      if (
        !Array.isArray(balance.balance_infos) ||
        balance.balance_infos.length === 0
      )
        return { status: 'unavailable', balances: [], checkedAt };
      return {
        status: 'available',
        balances: balance.balance_infos.map((entry) => ({
          currency: entry.currency,
          amount: entry.total_balance,
        })),
        checkedAt,
      };
    } catch {
      return { status: 'unavailable', balances: [], checkedAt };
    }
  }
}
