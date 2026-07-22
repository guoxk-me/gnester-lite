// CN: 测试文件，验证 configuration 的行为契约；EN: Test file verifies behavior contracts for configuration.
import 'reflect-metadata';
import { validate } from './validation';

const baseEnv = {
  NODE_ENV: 'development',
  PORT: 3000,
};
const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  JWT_SECRET: 'production-secret',
  ENCRYPTION_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  HMAC_SECRET: 'production-hmac-secret',
};

// CN: 测试分组：environment validation；EN: Test group: environment validation.
describe('environment validation', () => {
  // CN: 测试用例：defaults CORS support to enabled with browser-app defaults；EN: Test case: defaults CORS support to enabled with browser-app defaults.
  it('defaults CORS support to enabled with browser-app defaults', () => {
    const config = validate(baseEnv);

    expect(config.CORS_ENABLED).toBe(true);
    expect(config.CORS_CREDENTIALS).toBe(true);
    expect(config.CORS_METHODS).toBe('GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    expect(config.CORS_MAX_AGE).toBe(600);
    expect(config.CORS_OPTIONS_SUCCESS_STATUS).toBe(204);
  });

  // CN: 测试用例：coerces explicit CORS settings from environment strings；EN: Test case: coerces explicit CORS settings from environment strings.
  it('coerces explicit CORS settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      CORS_ENABLED: 'false',
      CORS_CREDENTIALS: 'false',
      CORS_ORIGINS: 'https://app.example.com',
      CORS_MAX_AGE: '3600',
      CORS_OPTIONS_SUCCESS_STATUS: '200',
    });

    expect(config.CORS_ENABLED).toBe(false);
    expect(config.CORS_CREDENTIALS).toBe(false);
    expect(config.CORS_ORIGINS).toBe('https://app.example.com');
    expect(config.CORS_MAX_AGE).toBe(3600);
    expect(config.CORS_OPTIONS_SUCCESS_STATUS).toBe(200);
  });

  // CN: 测试用例：rejects production CORS without explicit origins；EN: Test case: rejects production CORS without explicit origins.
  it('rejects production CORS without explicit origins', () => {
    expect(() =>
      validate({
        ...productionEnv,
      }),
    ).toThrow('CORS_ORIGINS is required when CORS is enabled in production.');
  });

  // CN: 测试用例：rejects wildcard origins with credentialed CORS；EN: Test case: rejects wildcard origins with credentialed CORS.
  it('rejects wildcard origins with credentialed CORS', () => {
    expect(() =>
      validate({
        ...baseEnv,
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'true',
      }),
    ).toThrow('CORS_CREDENTIALS=true cannot be combined with CORS_ORIGINS=*.');
  });

  // CN: 测试用例：defaults HTTP compression to enabled with balanced gzip settings；EN: Test case: defaults HTTP compression to enabled with balanced gzip settings.
  it('defaults HTTP compression to enabled with balanced gzip settings', () => {
    const config = validate(baseEnv);

    expect(config.COMPRESSION_ENABLED).toBe(true);
    expect(config.COMPRESSION_THRESHOLD).toBe('1kb');
    expect(config.COMPRESSION_LEVEL).toBe(6);
  });

  // CN: 测试用例：coerces explicit compression settings from environment strings；EN: Test case: coerces explicit compression settings from environment strings.
  it('coerces explicit compression settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      COMPRESSION_ENABLED: 'false',
      COMPRESSION_THRESHOLD: '2kb',
      COMPRESSION_LEVEL: '1',
    });

    expect(config.COMPRESSION_ENABLED).toBe(false);
    expect(config.COMPRESSION_THRESHOLD).toBe('2kb');
    expect(config.COMPRESSION_LEVEL).toBe(1);
  });

  // CN: 测试用例：rejects unsupported compression levels；EN: Test case: rejects unsupported compression levels.
  it('rejects unsupported compression levels', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_LEVEL: '10',
      }),
    ).toThrow();
  });

  // CN: 测试用例：rejects malformed compression thresholds；EN: Test case: rejects malformed compression thresholds.
  it('rejects malformed compression thresholds', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_THRESHOLD: 'large',
      }),
    ).toThrow();
  });

  // CN: 测试用例：rejects non-boolean compression flags；EN: Test case: rejects non-boolean compression flags.
  it('rejects non-boolean compression flags', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_ENABLED: 'sometimes',
      }),
    ).toThrow();
  });

  // CN: 测试用例：defaults session support to enabled with secure cookie defaults；EN: Test case: defaults session support to enabled with secure cookie defaults.
  it('defaults session support to enabled with secure cookie defaults', () => {
    const config = validate(baseEnv);

    expect(config.SESSION_ENABLED).toBe(true);
    expect(config.SESSION_COOKIE_NAME).toBe('gnester.sid');
    expect(config.SESSION_COOKIE_MAX_AGE).toBe(86_400_000);
    expect(config.SESSION_COOKIE_SAME_SITE).toBe('lax');
  });

  // CN: 测试用例：coerces explicit session settings from environment strings；EN: Test case: coerces explicit session settings from environment strings.
  it('coerces explicit session settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      SESSION_ENABLED: 'false',
      SESSION_COOKIE_NAME: 'custom.sid',
      SESSION_COOKIE_MAX_AGE: '3600000',
      SESSION_COOKIE_SECURE: 'true',
      SESSION_COOKIE_SAME_SITE: 'strict',
    });

    expect(config.SESSION_ENABLED).toBe(false);
    expect(config.SESSION_COOKIE_NAME).toBe('custom.sid');
    expect(config.SESSION_COOKIE_MAX_AGE).toBe(3_600_000);
    expect(config.SESSION_COOKIE_SECURE).toBe(true);
    expect(config.SESSION_COOKIE_SAME_SITE).toBe('strict');
  });

  // CN: 测试用例：rejects unsupported same-site session cookie policies；EN: Test case: rejects unsupported same-site session cookie policies.
  it('rejects unsupported same-site session cookie policies', () => {
    expect(() =>
      validate({
        ...baseEnv,
        SESSION_COOKIE_SAME_SITE: 'cross-site',
      }),
    ).toThrow();
  });

  // CN: 测试用例：defaults CSRF protection to enabled with browser-safe token settings；EN: Test case: defaults CSRF protection to enabled with browser-safe token settings.
  it('defaults CSRF protection to enabled with browser-safe token settings', () => {
    const config = validate(baseEnv);

    expect(config.CSRF_ENABLED).toBe(true);
    expect(config.CSRF_COOKIE_NAME).toBe('gnester.csrf-token');
    expect(config.CSRF_IDENTIFIER_COOKIE_NAME).toBe('gnester.csrf-id');
    expect(config.CSRF_HEADER_NAME).toBe('x-csrf-token');
    expect(config.CSRF_COOKIE_SAME_SITE).toBe('lax');
  });

  // CN: 测试用例：coerces explicit CSRF settings from environment strings；EN: Test case: coerces explicit CSRF settings from environment strings.
  it('coerces explicit CSRF settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      CSRF_ENABLED: 'false',
      CSRF_COOKIE_NAME: 'custom.csrf-token',
      CSRF_IDENTIFIER_COOKIE_NAME: 'custom.csrf-id',
      CSRF_COOKIE_SECURE: 'true',
      CSRF_COOKIE_SAME_SITE: 'strict',
      CSRF_HEADER_NAME: 'x-xsrf-token',
    });

    expect(config.CSRF_ENABLED).toBe(false);
    expect(config.CSRF_COOKIE_NAME).toBe('custom.csrf-token');
    expect(config.CSRF_IDENTIFIER_COOKIE_NAME).toBe('custom.csrf-id');
    expect(config.CSRF_COOKIE_SECURE).toBe(true);
    expect(config.CSRF_COOKIE_SAME_SITE).toBe('strict');
    expect(config.CSRF_HEADER_NAME).toBe('x-xsrf-token');
  });

  // CN: 测试用例：requires a CSRF secret when CSRF is enabled in production；EN: Test case: requires a CSRF secret when CSRF is enabled in production.
  it('requires a CSRF secret when CSRF is enabled in production', () => {
    expect(() =>
      validate({
        ...productionEnv,
        CORS_ORIGINS: 'https://app.example.com',
      }),
    ).toThrow('CSRF_SECRET is required in production when CSRF is enabled.');
  });

  // CN: 测试用例：allows production without a CSRF secret when CSRF is disabled；EN: Test case: allows production without a CSRF secret when CSRF is disabled.
  it('allows production without a CSRF secret when CSRF is disabled', () => {
    const config = validate({
      ...productionEnv,
      CORS_ORIGINS: 'https://app.example.com',
      CSRF_ENABLED: 'false',
    });

    expect(config.CSRF_ENABLED).toBe(false);
  });

  // CN: 测试用例：coerces logger settings from environment strings；EN: Test case: coerces logger settings from environment strings.
  it('coerces logger settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      LOGGER_JSON: 'true',
      LOGGER_LEVELS: 'error,warn,debug',
    });

    expect(config.LOGGER_JSON).toBe(true);
    expect(config.LOGGER_LEVELS).toBe('error,warn,debug');
  });

  // CN: 测试用例：rejects unsupported logger levels；EN: Test case: rejects unsupported logger levels.
  it('rejects unsupported logger levels', () => {
    expect(() =>
      validate({
        ...baseEnv,
        LOGGER_LEVELS: 'error,trace',
      }),
    ).toThrow();
  });
});
