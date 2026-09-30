import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { generateText } from 'ai';
import {
  AssistantProviderService,
  isTextModel,
} from './assistant-provider.service.js';

vi.mock('ai', () => ({ generateText: vi.fn() }));

// AI modified: protocol tests use controlled responses so the refactor never calls a real model or exposes real credentials.
describe('assistant official provider boundary', () => {
  const providers = new AssistantProviderService();
  const providerFetch = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', providerFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('bounds catalog requests and rejects transport, credentials and malformed catalogs', async () => {
    providerFetch.mockRejectedValueOnce(new Error('network'));
    await expect(
      providers.readCatalog('deepseek', 'fixture-key'),
    ).rejects.toThrow(ServiceUnavailableException);
    providerFetch.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(
      providers.readCatalog('openai', 'fixture-key'),
    ).rejects.toThrow(BadRequestException);
    providerFetch.mockResolvedValueOnce(Response.json({ data: {} }));
    await expect(
      providers.readCatalog('openai', 'fixture-key'),
    ).rejects.toThrow(ServiceUnavailableException);
    providerFetch.mockResolvedValueOnce(
      Response.json({
        data: [{ id: 'gpt-4o' }, { id: 12 }, { id: 'x'.repeat(101) }],
      }),
    );
    await expect(
      providers.readCatalog('openai', 'fixture-key'),
    ).resolves.toEqual([{ id: 'gpt-4o' }]);
    expect(providerFetch).toHaveBeenLastCalledWith(
      'https://api.openai.com/v1/models',
      {
        headers: {
          Authorization: 'Bearer fixture-key',
          Accept: 'application/json',
        },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('returns unsupported or unavailable balances without making up an amount', async () => {
    await expect(providers.readBalance('openai', '')).resolves.toMatchObject({
      status: 'unsupported',
      balances: [],
    });
    expect(providerFetch).not.toHaveBeenCalled();
    providerFetch.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(
      providers.readBalance('deepseek', 'fixture-key'),
    ).resolves.toMatchObject({ status: 'unavailable', balances: [] });
    providerFetch.mockResolvedValueOnce(Response.json({ balance_infos: [] }));
    await expect(
      providers.readBalance('deepseek', 'fixture-key'),
    ).resolves.toMatchObject({ status: 'unavailable', balances: [] });
    providerFetch.mockResolvedValueOnce(
      Response.json({
        balance_infos: [{ currency: 'USD', total_balance: '2.50' }],
      }),
    );
    await expect(
      providers.readBalance('deepseek', 'fixture-key'),
    ).resolves.toMatchObject({
      status: 'available',
      balances: [{ currency: 'USD', amount: '2.50' }],
    });
  });

  it('distinguishes model retirement and credential failure from unrelated errors', () => {
    expect(
      providers.isMissingModelFailure({
        responseBody: '{"error":{"type":"model_not_exist"}}',
      }),
    ).toBe(true);
    expect(providers.isMissingModelFailure(null)).toBe(false);
    expect(
      providers.isMissingModelFailure({ responseBody: 'invalid JSON' }),
    ).toBe(false);
    expect(
      providers.credentialFailure(
        { responseBody: '{"error":{"code":"invalid_api_key"}}' },
        'openai',
      ),
    ).toBe('key_invalid');
    expect(
      providers.credentialFailure(
        { responseBody: '{"error":{"code":123}}' },
        'openai',
      ),
    ).toBeNull();
    expect(providers.credentialFailure(null, 'openai')).toBeNull();
    expect(providers.credentialFailure({}, 'openai')).toBeNull();
    expect(
      isTextModel('deepseek', {
        id: 'new-model',
        input_modalities: ['text'],
        output_modalities: ['image'],
      }),
    ).toBe(false);
    expect(
      isTextModel('deepseek', {
        id: 'new-model',
        input_modalities: ['text'],
        output_modalities: ['text'],
      }),
    ).toBe(true);
  });

  it('uses provider-specific probe options without real text generation', async () => {
    await providers.verifyTextGeneration(
      'deepseek',
      'deepseek-chat',
      'fixture-key',
    );
    expect(generateText).toHaveBeenLastCalledWith(
      expect.objectContaining({
        maxOutputTokens: 16,
        providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
      }),
    );
    await providers.verifyTextGeneration(
      'deepseek',
      'deepseek-reasoner',
      'fixture-key',
    );
    expect(generateText).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ providerOptions: expect.anything() }),
    );
    await providers.verifyTextGeneration('openai', 'gpt-4o', 'fixture-key');
    expect(generateText).toHaveBeenLastCalledWith(
      expect.objectContaining({
        providerOptions: { openai: { store: false } },
      }),
    );
  });
});
