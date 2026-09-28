import { ExecutionContext } from '@nestjs/common';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { createThrottlerModuleOptions, getClientIp } from './rate-limit.config';

type ConfiguredThrottlerOptions = Exclude<ThrottlerModuleOptions, unknown[]>;

describe('createThrottlerModuleOptions', () => {
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
    expect(
      options.getTracker?.(
        {
          ips: ['198.51.100.10'],
          ip: '127.0.0.1',
        },
        {} as ExecutionContext,
      ),
    ).toBe('198.51.100.10');
  });

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

describe('getClientIp', () => {
  it.each([
    [
      'trusted proxy chain',
      {
        ips: ['198.51.100.10', '127.0.0.1'],
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      },
      '198.51.100.10',
    ],
    [
      'Express request ip',
      {
        ips: [],
        ip: '203.0.113.20',
        socket: { remoteAddress: '127.0.0.1' },
      },
      '203.0.113.20',
    ],
    [
      'socket fallback',
      {
        ips: [],
        socket: { remoteAddress: '::1' },
      },
      '::1',
    ],
    [
      'missing address',
      {
        ips: [],
        ip: '',
        socket: { remoteAddress: '' },
      },
      'unknown',
    ],
  ] as const)('uses the %s identity source', (_scenario, request, expected) => {
    expect(getClientIp(request)).toBe(expected);
  });

  it('ignores non-object socket values', () => {
    expect(getClientIp({ socket: null })).toBe('unknown');
  });
});
