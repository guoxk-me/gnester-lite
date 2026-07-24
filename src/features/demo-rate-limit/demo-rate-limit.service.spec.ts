// CN: 测试文件，验证 demo-rate-limit 的行为契约；EN: Test file verifies behavior contracts for demo-rate-limit.
import { DemoRateLimitService } from './demo-rate-limit.service';

// CN: 测试分组：DemoRateLimitService；EN: Test group: DemoRateLimitService.
describe('DemoRateLimitService', () => {
  let service: DemoRateLimitService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoRateLimitService();
  });

  // CN: 测试用例：documents the global throttler wiring；EN: Test case: documents the global throttler wiring.
  it('documents the global throttler wiring', () => {
    const overview = service.getOverview();

    expect(overview.module).toBe('CommonRateLimitModule');
    expect(overview.package).toBe('@nestjs/throttler');
    expect(overview.registration).toContain('APP_GUARD');
    expect(overview.scenarios).toEqual(
      expect.arrayContaining([
        expect.stringContaining('@Throttle()'),
        expect.stringContaining('@SkipThrottle()'),
      ]),
    );
  });

  // CN: 测试用例：exposes the three rate-limit demo scenarios；EN: Test case: exposes the three rate-limit demo scenarios.
  it('exposes the three rate-limit demo scenarios', () => {
    expect(service.getDefaultScenario()).toEqual({
      scenario: 'default-public-api',
      strategy: 'Uses the global named throttlers from config/config.yaml.',
    });
    expect(service.getCredentialScenario()).toEqual({
      scenario: 'credential-entrypoint',
      strategy:
        'Overrides the short throttler to one request per minute for login-style endpoints.',
    });
    expect(service.getSkippedScenario()).toEqual({
      scenario: 'health-check',
      strategy:
        'Uses @SkipThrottle() for the template throttler names because infrastructure probes should not consume user budgets.',
    });
  });
});
