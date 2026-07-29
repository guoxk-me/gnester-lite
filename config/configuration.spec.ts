import 'reflect-metadata';
import configuration, { validateYamlConfig } from './configuration';

describe('configuration', () => {
  it('uses Beijing time for scheduled jobs by default', () => {
    const config = configuration();

    expect(config.schedule.enabled).toBe(false);
    expect(config.schedule.timeZone).toBe('Asia/Shanghai');
    expect(config.queue).toEqual({
      enabled: true,
      prefix: 'gnester-lite',
      defaultAttempts: 3,
      backoffDelay: 1000,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    expect(config.http).toEqual({
      baseUrl: 'https://jsonplaceholder.typicode.com',
      timeout: 5000,
      maxRedirects: 5,
      maxContentLength: 10485760,
      maxBodyLength: 10485760,
    });
    expect(config.rateLimit).toEqual({
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
          name: 'medium',
          ttl: 10000,
          limit: 20,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
    });
  });

  it('rejects non-IANA schedule time zones', () => {
    expect(() =>
      validateYamlConfig({
        app: {
          name: 'gnester-lite',
        },
        cache: {
          ttl: 0,
        },
        schedule: {
          enabled: false,
          timeZone: 'UTC+8',
        },
        queue: {
          enabled: true,
          prefix: 'gnester-lite',
          defaultAttempts: 3,
          backoffDelay: 1000,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
        http: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
          maxRedirects: 5,
          maxContentLength: 10485760,
          maxBodyLength: 10485760,
        },
        rateLimit: {
          enabled: true,
          trustProxy: 'loopback',
          errorMessage: 'Too many requests',
          throttlers: [
            {
              name: 'short',
              ttl: 1000,
              limit: 3,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects queues without a retry attempt budget', () => {
    expect(() =>
      validateYamlConfig({
        app: {
          name: 'gnester-lite',
        },
        cache: {
          ttl: 0,
        },
        schedule: {
          enabled: false,
          timeZone: 'Asia/Shanghai',
        },
        queue: {
          enabled: true,
          prefix: 'gnester-lite',
          defaultAttempts: 0,
          backoffDelay: 1000,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
        http: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
          maxRedirects: 5,
          maxContentLength: 10485760,
          maxBodyLength: 10485760,
        },
        rateLimit: {
          enabled: true,
          trustProxy: 'loopback',
          errorMessage: 'Too many requests',
          throttlers: [
            {
              name: 'short',
              ttl: 1000,
              limit: 3,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects outbound HTTP clients without a timeout budget', () => {
    expect(() =>
      validateYamlConfig({
        app: {
          name: 'gnester-lite',
        },
        cache: {
          ttl: 0,
        },
        schedule: {
          enabled: false,
          timeZone: 'Asia/Shanghai',
        },
        queue: {
          enabled: true,
          prefix: 'gnester-lite',
          defaultAttempts: 3,
          backoffDelay: 1000,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
        http: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 0,
          maxRedirects: 5,
          maxContentLength: 10485760,
          maxBodyLength: 10485760,
        },
        rateLimit: {
          enabled: true,
          trustProxy: 'loopback',
          errorMessage: 'Too many requests',
          throttlers: [
            {
              name: 'short',
              ttl: 1000,
              limit: 3,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('rejects rate limit throttlers without a request budget', () => {
    expect(() =>
      validateYamlConfig({
        app: {
          name: 'gnester-lite',
        },
        cache: {
          ttl: 0,
        },
        schedule: {
          enabled: false,
          timeZone: 'Asia/Shanghai',
        },
        queue: {
          enabled: true,
          prefix: 'gnester-lite',
          defaultAttempts: 3,
          backoffDelay: 1000,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
        http: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
          maxRedirects: 5,
          maxContentLength: 10485760,
          maxBodyLength: 10485760,
        },
        rateLimit: {
          enabled: true,
          trustProxy: 'loopback',
          errorMessage: 'Too many requests',
          throttlers: [
            {
              name: 'short',
              ttl: 1000,
              limit: 0,
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('requires unique throttler names and the credential-entrypoint budget', () => {
    const validConfig = configuration();
    const withoutShort = {
      ...validConfig,
      rateLimit: {
        ...validConfig.rateLimit,
        throttlers: validConfig.rateLimit.throttlers.filter(
          (throttler) => throttler.name !== 'short',
        ),
      },
    };
    const duplicateShort = {
      ...validConfig,
      rateLimit: {
        ...validConfig.rateLimit,
        throttlers: [
          ...validConfig.rateLimit.throttlers,
          { name: 'short', ttl: 5000, limit: 1 },
        ],
      },
    };

    expect(() =>
      validateYamlConfig(withoutShort as unknown as Record<string, unknown>),
    ).toThrow(
      'The "short" rate-limit throttler is required by credential entrypoints.',
    );
    expect(() =>
      validateYamlConfig(duplicateShort as unknown as Record<string, unknown>),
    ).toThrow('Rate-limit throttler names must be unique.');
  });

  it('rejects fractional values for discrete YAML budgets', () => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        queue: {
          ...validConfig.queue,
          defaultAttempts: 1.5,
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
    expect(() =>
      validateYamlConfig({
        ...validConfig,
        rateLimit: {
          ...validConfig.rateLimit,
          throttlers: validConfig.rateLimit.throttlers.map(
            (throttler, index) =>
              index === 0 ? { ...throttler, limit: 1.5 } : throttler,
          ),
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
  });

  it.each(['schedule', 'queue', 'rateLimit'] as const)(
    'rejects quoted booleans for %s.enabled instead of changing their meaning',
    (section) => {
      const validConfig = configuration();

      expect(() =>
        validateYamlConfig({
          ...validConfig,
          [section]: {
            ...validConfig[section],
            enabled: 'false',
          },
        } as unknown as Record<string, unknown>),
      ).toThrow();
    },
  );

  it.each(['ftp://example.com', 'file:///tmp/example'])(
    'rejects the unsupported outbound HTTP base URL %s',
    (baseUrl) => {
      const validConfig = configuration();

      expect(() =>
        validateYamlConfig({
          ...validConfig,
          http: {
            ...validConfig.http,
            baseUrl,
          },
        } as unknown as Record<string, unknown>),
      ).toThrow();
    },
  );

  it('accepts bounded Redis namespace segments with common punctuation', () => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        app: {
          name: 'orders-api_v2.stage',
        },
        queue: {
          ...validConfig.queue,
          prefix: 'orders-api_v2.stage',
        },
      } as unknown as Record<string, unknown>),
    ).not.toThrow();
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['namespace-delimited', 'orders:api'],
    ['control-character', 'orders\napi'],
    ['overlong', 'a'.repeat(65)],
  ])('rejects an %s application name', (_scenario, applicationName) => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        app: {
          name: applicationName,
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['namespace-delimited', 'jobs:queue'],
    ['control-character', 'jobs\tqueue'],
    ['overlong', 'q'.repeat(65)],
  ])('rejects an %s queue prefix', (_scenario, queuePrefix) => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        queue: {
          ...validConfig.queue,
          prefix: queuePrefix,
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', ' \t '],
  ])('rejects an %s rate-limit error message', (_scenario, errorMessage) => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        rateLimit: {
          ...validConfig.rateLimit,
          errorMessage,
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
  });

  it('rejects undeclared YAML keys at every configured nesting level', () => {
    const validConfig = configuration();

    expect(() =>
      validateYamlConfig({
        ...validConfig,
        unexpectedRoot: true,
      } as unknown as Record<string, unknown>),
    ).toThrow();
    expect(() =>
      validateYamlConfig({
        ...validConfig,
        app: {
          ...validConfig.app,
          unexpectedAppSetting: true,
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
    expect(() =>
      validateYamlConfig({
        ...validConfig,
        rateLimit: {
          ...validConfig.rateLimit,
          throttlers: validConfig.rateLimit.throttlers.map(
            (throttler, index) =>
              index === 0
                ? { ...throttler, unexpectedThrottlerSetting: true }
                : throttler,
          ),
        },
      } as unknown as Record<string, unknown>),
    ).toThrow();
  });
});
