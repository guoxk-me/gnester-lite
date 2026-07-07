// CN: 服务，承载 demo-rate-limit 的业务逻辑；EN: Service holds business logic for demo-rate-limit.
import { Injectable } from '@nestjs/common';
import { DemoRateLimitOverviewDto } from './dto/demo-rate-limit-overview.dto';
import { DemoRateLimitScenarioDto } from './dto/demo-rate-limit-scenario.dto';

@Injectable()
export class DemoRateLimitService {
  // CN: 执行 demo-rate-limit 的 get overview 业务逻辑；EN: Runs the get overview business logic for demo-rate-limit.
  getOverview(): DemoRateLimitOverviewDto {
    return {
      module: 'CommonRateLimitModule',
      package: '@nestjs/throttler',
      registration: 'global APP_GUARD with YAML-backed throttler definitions',
      scenarios: [
        'Apply a baseline request budget to public REST endpoints.',
        'Use @Throttle() to tighten credential, OTP, invite, and webhook endpoints.',
        'Use @SkipThrottle() for health checks and trusted internal readiness probes.',
        'Enable trust proxy when the service runs behind a reverse proxy.',
      ],
    };
  }

  // CN: 执行 demo-rate-limit 的 get default scenario 业务逻辑；EN: Runs the get default scenario business logic for demo-rate-limit.
  getDefaultScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'default-public-api',
      strategy: 'Uses the global named throttlers from config/config.yaml.',
    };
  }

  // CN: 执行 demo-rate-limit 的 get credential scenario 业务逻辑；EN: Runs the get credential scenario business logic for demo-rate-limit.
  getCredentialScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'credential-entrypoint',
      strategy:
        'Overrides the short throttler to one request per minute for login-style endpoints.',
    };
  }

  // CN: 执行 demo-rate-limit 的 get skipped scenario 业务逻辑；EN: Runs the get skipped scenario business logic for demo-rate-limit.
  getSkippedScenario(): DemoRateLimitScenarioDto {
    return {
      scenario: 'health-check',
      strategy:
        'Uses @SkipThrottle() for the template throttler names because infrastructure probes should not consume user budgets.',
    };
  }
}
