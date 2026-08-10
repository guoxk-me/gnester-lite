import { PasswordHashService } from './password-hash.service';

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
});
