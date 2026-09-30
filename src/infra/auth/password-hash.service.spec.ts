import { PasswordHashService } from './password-hash.service.js';

describe('PasswordHashService', () => {
  let service: PasswordHashService;

  beforeEach(() => {
    service = new PasswordHashService();
  });

  it('stores passwords as salted hashes instead of plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('verifies only the original password against the stored hash', async () => {
    const hash = await service.hash('demo-password');

    await expect(service.verify('demo-password', hash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
  });

  it('accepts existing credential hashes and their Unicode normalization rule', async () => {
    // AI modified: old account passwords must remain usable after the auth runtime changes.
    const legacyHash =
      '0123456789abcdef0123456789abcdef:b88ef614438c4a82177c7583bbaaf9af65588951a9534956c3e98d721514ac043dfd96caa33761029d8e478e50adf4363805b89e31f17bfa2b8b44b7c399e2b3';
    await expect(service.verify('legacy-password-①', legacyHash)).resolves.toBe(
      true,
    );
    await expect(
      service.verify('legacy-password-wrong', legacyHash),
    ).resolves.toBe(false);
  });
});
