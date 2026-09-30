import type { DataSource } from 'typeorm';

import type { SymmetricEncryptionService } from '../../infra/crypto/symmetric-encryption.service.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';
import {
  AssistantProviderService,
  isTextModel,
} from './assistant-provider.service.js';

describe('personal assistant models', () => {
  it('admits only known text models from official catalog entries', () => {
    expect(isTextModel('deepseek', { id: 'deepseek-chat' })).toBe(true);
    expect(isTextModel('deepseek', { id: 'deepseek-ocr' })).toBe(false);
    expect(isTextModel('openai', { id: 'gpt-4o-mini' })).toBe(true);
    expect(isTextModel('openai', { id: 'gpt-image-1' })).toBe(false);
    expect(isTextModel('openai', { id: 'text-embedding-3-small' })).toBe(false);
    expect(isTextModel('openai', { id: 'gpt-4o-audio-preview' })).toBe(false);
    expect(isTextModel('openai', { id: 'gpt-4o-search-preview' })).toBe(false);
  });

  it("never selects a different account's Key", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AssistantConfigurationService(
      { query } as unknown as DataSource,
      { decryptString: vi.fn() } as unknown as SymmetricEncryptionService,
      new AssistantProviderService(),
    );
    await expect(
      service.generationKey(
        'user-1',
        { provider: 'deepseek', modelId: 'deepseek-chat' },
        null,
      ),
    ).resolves.toBeNull();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('k.`userId` = ?'),
      ['user-1', 'deepseek', 'deepseek-chat'],
    );
  });

  it('switches Keys only for explicit quota or authentication errors', () => {
    const service = new AssistantProviderService();
    expect(
      service.credentialFailure(
        {
          statusCode: 429,
          responseBody: '{"error":{"code":"rate_limit_exceeded"}}',
        },
        'openai',
      ),
    ).toBeNull();
    expect(
      service.credentialFailure(
        {
          statusCode: 429,
          responseBody: '{"error":{"code":"insufficient_quota"}}',
        },
        'openai',
      ),
    ).toBe('quota_exhausted');
    expect(service.credentialFailure({ statusCode: 402 }, 'deepseek')).toBe(
      'quota_exhausted',
    );
    expect(service.credentialFailure({ statusCode: 401 }, 'openai')).toBe(
      'key_invalid',
    );
  });

  it('uses the next enabled Key in administrator-defined order after a credential failure', async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: 'primary',
        provider: 'deepseek',
        position: 0,
        lastErrorCode: 'quota_exhausted',
        encryptedKey: 'secret-1',
      },
      {
        id: 'backup',
        provider: 'deepseek',
        position: 1,
        lastErrorCode: null,
        encryptedKey: 'secret-2',
      },
    ]);
    const decryptString = vi.fn().mockReturnValue('backup-secret');
    const service = new AssistantConfigurationService(
      { query } as unknown as DataSource,
      { decryptString } as unknown as SymmetricEncryptionService,
      new AssistantProviderService(),
    );
    await expect(
      service.nextGenerationKey(
        'user-1',
        { provider: 'deepseek', modelId: 'deepseek-chat' },
        'primary',
      ),
    ).resolves.toEqual({ id: 'backup', apiKey: 'backup-secret' });
    expect(decryptString).toHaveBeenCalledWith(
      'secret-2',
      'user-1:deepseek:backup',
    );
  });
});
