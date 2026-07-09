// CN: 测试文件，验证 security common 的行为契约；EN: Test file verifies behavior contracts for security common.
import { Environment } from 'config/config.types';
import { createHelmetOptions } from './helmet-options';

// CN: 测试分组：createHelmetOptions；EN: Test group: createHelmetOptions.
describe('createHelmetOptions', () => {
  // CN: 测试用例：keeps development localhost usable while applying default CSP directives；EN: Test case: keeps development localhost usable while applying default CSP directives.
  it('keeps development localhost usable while applying default CSP directives', () => {
    const options = createHelmetOptions(Environment.Development);

    expect(options.contentSecurityPolicy).toEqual({
      directives: {
        upgradeInsecureRequests: null,
      },
    });
    expect(options.strictTransportSecurity).toBe(false);
    expect(options.crossOriginEmbedderPolicy).toBe(false);
  });

  // CN: 测试用例：enables production HTTPS hardening with HSTS and CSP upgrades；EN: Test case: enables production HTTPS hardening with HSTS and CSP upgrades.
  it('enables production HTTPS hardening with HSTS and CSP upgrades', () => {
    const options = createHelmetOptions(Environment.Production);

    expect(options.contentSecurityPolicy).toEqual({
      directives: {
        upgradeInsecureRequests: [],
      },
    });
    expect(options.strictTransportSecurity).toEqual({
      includeSubDomains: true,
      maxAge: 31_536_000,
    });
    expect(options.crossOriginEmbedderPolicy).toBe(false);
  });
});
