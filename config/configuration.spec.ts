// CN: 测试文件，验证 configuration 的行为契约；EN: Test file verifies behavior contracts for configuration.
import 'reflect-metadata';
import configuration, { validateYamlConfig } from './configuration';

// CN: 测试分组：configuration；EN: Test group: configuration.
describe('configuration', () => {
  // CN: 测试用例：uses Beijing time for scheduled jobs by default；EN: Test case: uses Beijing time for scheduled jobs by default.
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

  // CN: 测试用例：rejects non-IANA schedule time zones；EN: Test case: rejects non-IANA schedule time zones.
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

  // CN: 测试用例：rejects queues without a retry attempt budget；EN: Test case: rejects queues without a retry attempt budget.
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

  // CN: 测试用例：rejects outbound HTTP clients without a timeout budget；EN: Test case: rejects outbound HTTP clients without a timeout budget.
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

  // CN: 测试用例：rejects rate limit throttlers without a request budget；EN: Test case: rejects rate limit throttlers without a request budget.
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
});
