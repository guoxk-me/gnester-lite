// CN: 测试文件，验证 auth common 的行为契约；EN: Test file verifies behavior contracts for auth common.
import { PasswordHashService } from './password-hash.service';

// CN: 测试分组：PasswordHashService；EN: Test group: PasswordHashService.
describe('PasswordHashService', () => {
  let service: PasswordHashService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new PasswordHashService();
  });

  // CN: 测试用例：stores passwords as salted hashes instead of plaintext；EN: Test case: stores passwords as salted hashes instead of plaintext.
  it('stores passwords as salted hashes instead of plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  // CN: 测试用例：verifies only the original password against the stored hash；EN: Test case: verifies only the original password against the stored hash.
  it('verifies only the original password against the stored hash', async () => {
    const hash = await service.hash('demo-password');

    await expect(service.verify('demo-password', hash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
  });
});
