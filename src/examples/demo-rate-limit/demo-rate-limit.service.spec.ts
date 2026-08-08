import { DemoRateLimitService } from './demo-rate-limit.service';

describe('DemoRateLimitService', () => {
  let service: DemoRateLimitService;

  beforeEach(() => {
    service = new DemoRateLimitService();
  });

  it('documents the global throttler wiring', () => {
    const overview = service.getOverview();

    expect(overview.module).toBe('CommonRateLimitModule');
    expect(overview.package).toBe('@nestjs/throttler');
    expect(overview.registration).toContain('APP_GUARD');
    expect(overview.scenarios).toEqual(
      expect.arrayContaining([
        expect.stringContaining('@Throttle()'),
        expect.stringContaining('@SkipHttpThrottle()'),
      ]),
    );
  });

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
        'Uses @SkipHttpThrottle() to bypass every configured budget because infrastructure probes should not consume user quotas.',
    });
  });
});
