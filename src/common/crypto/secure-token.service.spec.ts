// CN: 测试文件，验证 crypto common 的行为契约；EN: Test file verifies behavior contracts for crypto common.
import { SecureTokenService } from './secure-token.service';

// CN: 测试分组：SecureTokenService；EN: Test group: SecureTokenService.
describe('SecureTokenService', () => {
  let service: SecureTokenService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new SecureTokenService();
  });

  // CN: 测试用例：generates URL-safe random tokens with the requested entropy；EN: Test case: generates URL-safe random tokens with the requested entropy.
  it('generates URL-safe random tokens with the requested entropy', () => {
    const first = service.generateUrlSafeToken(32);
    const second = service.generateUrlSafeToken(32);

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
  });

  // CN: 测试用例：hashes one-time tokens for storage and verifies only the original token；EN: Test case: hashes one-time tokens for storage and verifies only the original token.
  it('hashes one-time tokens for storage and verifies only the original token', () => {
    const token = service.generateUrlSafeToken(32);
    const digest = service.hashToken(token);

    expect(digest).toMatch(/^sha256:[A-Za-z0-9_-]+$/);
    expect(digest).not.toContain(token);
    expect(service.verifyToken(token, digest)).toBe(true);
    expect(service.verifyToken(`${token}x`, digest)).toBe(false);
  });
});
