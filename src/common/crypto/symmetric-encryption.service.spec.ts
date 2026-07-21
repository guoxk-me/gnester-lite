// CN: 测试文件，验证 crypto common 的行为契约；EN: Test file verifies behavior contracts for crypto common.
import { ConfigService } from '@nestjs/config';

import { SymmetricEncryptionService } from './symmetric-encryption.service';

// CN: 测试分组：SymmetricEncryptionService；EN: Test group: SymmetricEncryptionService.
describe('SymmetricEncryptionService', () => {
  let service: SymmetricEncryptionService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new SymmetricEncryptionService(
      new ConfigService({
        ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
        NODE_ENV: 'test',
      }),
    );
  });

  // CN: 测试用例：encrypts plaintext into a versioned authenticated payload that can be decrypted；EN: Test case: encrypts plaintext into a versioned authenticated payload that can be decrypted.
  it('encrypts plaintext into a versioned authenticated payload that can be decrypted', () => {
    const encrypted = service.encryptString('oauth-refresh-token', 'user:123');

    expect(encrypted).toMatch(/^v1:aes-256-gcm:[^:]+:[^:]+:[^:]+$/);
    expect(encrypted).not.toContain('oauth-refresh-token');
    expect(service.decryptString(encrypted, 'user:123')).toBe(
      'oauth-refresh-token',
    );
  });

  // CN: 测试用例：rejects ciphertext when the authenticated context changes；EN: Test case: rejects ciphertext when the authenticated context changes.
  it('rejects ciphertext when the authenticated context changes', () => {
    const encrypted = service.encryptString('private-setting', 'tenant:a');

    expect(() => service.decryptString(encrypted, 'tenant:b')).toThrow(
      'Encrypted payload authentication failed.',
    );
  });

  // CN: 测试用例：rejects malformed payloads instead of returning unsafe plaintext；EN: Test case: rejects malformed payloads instead of returning unsafe plaintext.
  it('rejects malformed payloads instead of returning unsafe plaintext', () => {
    expect(() => service.decryptString('not-a-payload')).toThrow(
      'Encrypted payload format is invalid.',
    );
  });
});
