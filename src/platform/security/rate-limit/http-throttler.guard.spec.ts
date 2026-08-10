import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';

import { HttpThrottlerGuard } from './http-throttler.guard';
import { SkipHttpThrottle } from './skip-http-throttle.decorator';

class TestableHttpThrottlerGuard extends HttpThrottlerGuard {
  isSkipped(context: ExecutionContext): Promise<boolean> {
    return this.shouldSkip(context);
  }
}

@SkipHttpThrottle()
class InfrastructureProbe {
  check(): void {}
}

describe('HttpThrottlerGuard', () => {
  const options: ThrottlerModuleOptions = {
    throttlers: [
      {
        name: 'custom-budget',
        limit: 3,
        ttl: 1000,
      },
    ],
  };
  const increment = jest.fn();
  const storage = {
    increment,
  } as unknown as ThrottlerStorage;
  const guard = new TestableHttpThrottlerGuard(
    options,
    storage,
    new Reflector(),
  );

  it.each(['ws', 'rpc'] as const)(
    'skips the HTTP header-based limiter for %s contexts',
    async (contextType) => {
      const context = {
        getType: () => contextType,
      } as ExecutionContext;

      await expect(guard.isSkipped(context)).resolves.toBe(true);
      expect(increment).not.toHaveBeenCalled();
    },
  );

  it('keeps HTTP requests subject to the configured limiter', async () => {
    const handler = () => undefined;
    class UserController {}

    const context = {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => UserController,
    } as unknown as ExecutionContext;

    await expect(guard.isSkipped(context)).resolves.toBe(false);
  });

  it('skips every budget for marked probes even when names are customized', async () => {
    const handler = Object.getOwnPropertyDescriptor(
      InfrastructureProbe.prototype,
      'check',
    )?.value as () => void;
    const context = {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => InfrastructureProbe,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(increment).not.toHaveBeenCalled();
  });
});
