import { ConfigService } from '@nestjs/config';

import { SymmetricEncryptionService } from './symmetric-encryption.service';

describe('SymmetricEncryptionService', () => {
  let service: SymmetricEncryptionService;

  beforeEach(() => {
    service = new SymmetricEncryptionService(
      new ConfigService({
        ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
        NODE_ENV: 'test',
      }),
    );
  });

  it('encrypts plaintext into a versioned authenticated payload that can be decrypted', () => {
    const encrypted = service.encryptString('oauth-refresh-token', 'user:123');

    expect(encrypted).toMatch(/^v1:aes-256-gcm:[^:]+:[^:]+:[^:]+$/);
    expect(encrypted).not.toContain('oauth-refresh-token');
    expect(service.decryptString(encrypted, 'user:123')).toBe(
      'oauth-refresh-token',
    );
  });

  it('rejects ciphertext when the authenticated context changes', () => {
    const encrypted = service.encryptString('private-setting', 'tenant:a');

    expect(() => service.decryptString(encrypted, 'tenant:b')).toThrow(
      'Encrypted payload authentication failed.',
    );
  });

  it('rejects malformed payloads instead of returning unsafe plaintext', () => {
    expect(() => service.decryptString('not-a-payload')).toThrow(
      'Encrypted payload format is invalid.',
    );
  });
});
