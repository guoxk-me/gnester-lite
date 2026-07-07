// CN: 测试文件，验证 rate-limit common 的行为契约；EN: Test file verifies behavior contracts for rate-limit common.
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { createThrottlerModuleOptions } from './rate-limit.config';

type ConfiguredThrottlerOptions = Exclude<ThrottlerModuleOptions, unknown[]>;

// CN: 测试分组：createThrottlerModuleOptions；EN: Test group: createThrottlerModuleOptions.
describe('createThrottlerModuleOptions', () => {
  // CN: 测试用例：maps template rate limit config to named throttler definitions；EN: Test case: maps template rate limit config to named throttler definitions.
  it('maps template rate limit config to named throttler definitions', () => {
    const options = createThrottlerModuleOptions({
      enabled: true,
      trustProxy: 'loopback',
      errorMessage: 'Too many requests',
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'auth',
          ttl: 60000,
          limit: 5,
        },
      ],
    }) as ConfiguredThrottlerOptions;

    expect(options).toEqual(
      expect.objectContaining({
        errorMessage: 'Too many requests',
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: 3,
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: 5,
          },
        ],
      }),
    );
    expect(options.skipIf?.({} as ExecutionContext)).toBe(false);
  });

  // CN: 测试用例：short-circuits throttling when the template disables rate limiting；EN: Test case: short-circuits throttling when the template disables rate limiting.
  it('short-circuits throttling when the template disables rate limiting', () => {
    const options = createThrottlerModuleOptions({
      enabled: false,
      trustProxy: 'loopback',
      errorMessage: 'Too many requests',
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
      ],
    }) as ConfiguredThrottlerOptions;

    expect(options.skipIf?.({} as ExecutionContext)).toBe(true);
  });
});
