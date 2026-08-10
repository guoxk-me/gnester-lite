import { Injectable } from '@nestjs/common';
import { DemoRateLimitOverviewDto } from './dto/demo-rate-limit-overview.dto';
import { DemoRateLimitScenarioDto } from './dto/demo-rate-limit-scenario.dto';

@Injectable()
export class DemoRateLimitService {
  getOverview(): DemoRateLimitOverviewDto {
    return {
      module: 'CommonRateLimitModule',
      package: '@nestjs/throttler',
      registration: 'global APP_GUARD with YAML-backed throttler definitions',
      scenarios: [
        'Apply a baseline request budget to public REST endpoints.',
        'Use @Throttle() to tighten credential, OTP, invite, and webhook endpoints.',
        'Use @SkipHttpThrottle() for health checks and trusted internal readiness probes.',
        'Enable trust proxy when the service runs behind a reverse proxy.',
      ],
    };
  }

  getDefaultScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'default-public-api',
      strategy: 'Uses the global named throttlers from config/config.yaml.',
    };
  }

  getCredentialScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'credential-entrypoint',
      strategy:
        'Overrides the short throttler to one request per minute for login-style endpoints.',
    };
  }

  getSkippedScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'health-check',
      strategy:
        'Uses @SkipHttpThrottle() to bypass every configured budget because infrastructure probes should not consume user quotas.',
    };
  }
}
