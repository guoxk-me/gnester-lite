// CN: 测试文件，验证 demo-security 的行为契约；EN: Test file verifies behavior contracts for demo-security.
import { DemoSecurityService } from './demo-security.service';

// CN: 测试分组：DemoSecurityService；EN: Test group: DemoSecurityService.
describe('DemoSecurityService', () => {
  let service: DemoSecurityService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoSecurityService();
  });

  // CN: 测试用例：documents the security headers enabled by the template；EN: Test case: documents the security headers enabled by the template.
  it('documents the security headers enabled by the template', () => {
    const overview = service.getSecurityOverview();

    expect(overview.middleware).toBe('helmet');
    expect(overview.registration).toBe(
      'global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes',
    );
    expect(overview.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Content-Security-Policy',
          defaultValue:
            "default-src 'self'; object-src 'none'; base-uri 'self'",
        }),
        expect.objectContaining({
          name: 'X-Content-Type-Options',
          defaultValue: 'nosniff',
        }),
        expect.objectContaining({
          name: 'X-Frame-Options',
          defaultValue: 'SAMEORIGIN',
        }),
      ]),
    );
    expect(overview.scenarios).toEqual(
      expect.arrayContaining([
        'Public REST APIs that should not leak framework fingerprints',
        'Browser-consumed APIs that need baseline XSS and clickjacking headers',
        'Production HTTPS services that should emit HSTS',
      ]),
    );
  });
});
