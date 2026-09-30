import { DECORATORS } from '@nestjs/swagger';
import { HealthController } from './infra/health/health.controller.js';

// AI modified: retained readiness probes must document dependency failures after the Demo catalog is removed.
describe('production OpenAPI errors', () => {
  it('documents readiness failures without changing the native probe contract', () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      Object.getOwnPropertyDescriptor(
        HealthController.prototype,
        'checkReadiness',
      )?.value,
    ) as Record<string, unknown>;
    expect(responses).toHaveProperty('200');
    expect(responses).toHaveProperty('503');
  });
});
