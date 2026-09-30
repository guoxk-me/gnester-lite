import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { validate } from './validation.js';

const baseEnv = {
  NODE_ENV: 'development',
  PORT: 3000,
};

function createProductionEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...baseEnv,
    NODE_ENV: 'production',
    DB_HOST: 'database.internal',
    DB_PORT: 3306,
    DB_USERNAME: 'application',
    DB_PASSWORD: randomBytes(24).toString('base64url'),
    DB_DATABASE: 'application',
    REDIS_URL: 'rediss://redis.internal:6379',
    CORS_ORIGINS: 'https://app.example.com',
    JWT_SECRET: randomBytes(48).toString('base64url'),
    CSRF_SECRET: randomBytes(48).toString('base64url'),
    ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
    HMAC_SECRET: randomBytes(48).toString('base64url'),
    ...overrides,
  };
}

const productionEnv = createProductionEnv();

describe('environment validation', () => {
  it('defaults CORS support to enabled with browser-app defaults', () => {
    const config = validate(baseEnv);

    expect(config.CORS_ENABLED).toBe(true);
    expect(config.CORS_CREDENTIALS).toBe(true);
    expect(config.CORS_METHODS).toBe('GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    expect(config.CORS_MAX_AGE).toBe(600);
    expect(config.CORS_OPTIONS_SUCCESS_STATUS).toBe(204);
  });

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

  it('rejects production CORS without explicit origins', () => {
    expect(() =>
      validate({
        ...productionEnv,
        CORS_ORIGINS: undefined,
      }),
    ).toThrow('CORS_ORIGINS is required when CORS is enabled in production.');
  });

  it('rejects wildcard origins with credentialed CORS', () => {
    expect(() =>
      validate({
        ...baseEnv,
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'true',
      }),
    ).toThrow('CORS_CREDENTIALS=true cannot be combined with CORS_ORIGINS=*.');
  });

  it('defaults HTTP compression to enabled with balanced gzip settings', () => {
    const config = validate(baseEnv);

    expect(config.COMPRESSION_ENABLED).toBe(true);
    expect(config.COMPRESSION_THRESHOLD).toBe('1kb');
    expect(config.COMPRESSION_LEVEL).toBe(6);
  });

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

  it('rejects unsupported compression levels', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_LEVEL: '10',
      }),
    ).toThrow();
  });

  it('rejects malformed compression thresholds', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_THRESHOLD: 'large',
      }),
    ).toThrow();
  });

  it('rejects non-boolean compression flags', () => {
    expect(() =>
      validate({
        ...baseEnv,
        COMPRESSION_ENABLED: 'sometimes',
      }),
    ).toThrow();
  });

  it('defaults CSRF protection to enabled with browser-safe token settings', () => {
    const config = validate(baseEnv);

    expect(config.CSRF_ENABLED).toBe(true);
    expect(config.CSRF_COOKIE_NAME).toBe('XSRF-TOKEN');
    expect(config.CSRF_IDENTIFIER_COOKIE_NAME).toBe('gnester.csrf-id');
    expect(config.CSRF_HEADER_NAME).toBe('X-XSRF-TOKEN');
    expect(config.CSRF_COOKIE_SAME_SITE).toBe('lax');
  });

  it('coerces explicit CSRF settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      CSRF_ENABLED: 'false',
      CSRF_COOKIE_NAME: 'XSRF-TOKEN',
      CSRF_IDENTIFIER_COOKIE_NAME: 'custom.csrf-id',
      CSRF_COOKIE_SECURE: 'true',
      CSRF_COOKIE_SAME_SITE: 'strict',
      CSRF_HEADER_NAME: 'X-XSRF-TOKEN',
    });

    expect(config.CSRF_ENABLED).toBe(false);
    expect(config.CSRF_COOKIE_NAME).toBe('XSRF-TOKEN');
    expect(config.CSRF_IDENTIFIER_COOKIE_NAME).toBe('custom.csrf-id');
    expect(config.CSRF_COOKIE_SECURE).toBe(true);
    expect(config.CSRF_COOKIE_SAME_SITE).toBe('strict');
    expect(config.CSRF_HEADER_NAME).toBe('X-XSRF-TOKEN');
  });

  it('requires a CSRF secret when CSRF is enabled in production', () => {
    expect(() =>
      validate({
        ...productionEnv,
        CSRF_SECRET: undefined,
      }),
    ).toThrow('CSRF_SECRET is required in production when CSRF is enabled.');
  });

  it('requires CSRF for production cookie authentication', () => {
    expect(() => validate({ ...productionEnv, CSRF_ENABLED: 'false' })).toThrow(
      'CSRF_ENABLED must be true for production cookie authentication.',
    );
  });

  it('rejects weak production secrets and repository placeholders', () => {
    const strongProductionEnv = {
      ...productionEnv,
      CSRF_ENABLED: 'true',
    };

    expect(() =>
      validate({
        ...strongProductionEnv,
        JWT_SECRET: 'short',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 bytes in production.');
    expect(() =>
      validate({
        ...strongProductionEnv,
        HMAC_SECRET: 'change-me-before-production-with-randomness',
      }),
    ).toThrow('HMAC_SECRET must not use a placeholder value in production.');
    expect(() =>
      validate({
        ...strongProductionEnv,
        CSRF_SECRET: 'replace-me-with-an-independent-random-value',
      }),
    ).toThrow('CSRF_SECRET must not use a placeholder value in production.');
    expect(() =>
      validate({
        ...strongProductionEnv,
        JWT_SECRET: 'abcd'.repeat(12),
      }),
    ).toThrow('JWT_SECRET must not use a low-diversity value in production.');
  });

  it('rejects empty JWT claims and excessive production token lifetimes', () => {
    const strongProductionEnv = {
      ...productionEnv,
    };

    expect(() =>
      validate({
        ...strongProductionEnv,
        JWT_ISSUER: ' ',
      }),
    ).toThrow('JWT_ISSUER must not be empty.');
    expect(() =>
      validate({
        ...strongProductionEnv,
        JWT_AUDIENCE: ' ',
      }),
    ).toThrow('JWT_AUDIENCE must not be empty.');
    expect(() =>
      validate({
        ...strongProductionEnv,
        JWT_ACCESS_TOKEN_TTL: '25h',
      }),
    ).toThrow('JWT_ACCESS_TOKEN_TTL must not exceed 24 hours in production.');
    expect(() =>
      validate({
        ...baseEnv,
        JWT_ACCESS_TOKEN_TTL: 'forever',
      }),
    ).toThrow();
    expect(() =>
      validate({
        ...baseEnv,
        JWT_ACCESS_TOKEN_TTL: '9007199254740992d',
      }),
    ).toThrow(
      'JWT_ACCESS_TOKEN_TTL must use a safe positive integer duration.',
    );
    expect(() =>
      validate({
        ...baseEnv,
        JWT_ACCESS_TOKEN_TTL: '9007199254740991d',
      }),
    ).toThrow(
      'JWT_ACCESS_TOKEN_TTL must resolve to a safe integer number of seconds.',
    );
  });

  it('coerces logger settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      LOGGER_JSON: 'true',
      LOGGER_LEVELS: 'error,warn,debug',
    });

    expect(config.LOGGER_JSON).toBe(true);
    expect(config.LOGGER_LEVELS).toBe('error,warn,debug');
  });

  it('rejects unsupported logger levels', () => {
    expect(() =>
      validate({
        ...baseEnv,
        LOGGER_LEVELS: 'error,trace',
      }),
    ).toThrow();
  });

  it('defaults Sentry to enabled with optional DSN', () => {
    const config = validate(baseEnv);

    expect(config.SENTRY_ENABLED).toBe(true);
    expect(config.SENTRY_DSN).toBeUndefined();
    expect(config.SENTRY_TRACES_SAMPLE_RATE).toBeUndefined();
  });

  it('coerces Sentry settings from environment strings', () => {
    const config = validate({
      ...baseEnv,
      SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0',
      SENTRY_ENABLED: 'false',
      SENTRY_TRACES_SAMPLE_RATE: '0.2',
    });

    expect(config.SENTRY_DSN).toBe(
      'https://examplePublicKey@o0.ingest.sentry.io/0',
    );
    expect(config.SENTRY_ENABLED).toBe(false);
    expect(config.SENTRY_TRACES_SAMPLE_RATE).toBe(0.2);
  });

  it('keeps a blank optional Sentry sample rate absent', () => {
    const config = validate({
      ...baseEnv,
      SENTRY_TRACES_SAMPLE_RATE: '   ',
    });

    expect(config.SENTRY_TRACES_SAMPLE_RATE).toBeUndefined();
  });

  it('accepts case-insensitive false for early and Nest Sentry configuration', () => {
    const config = validate({
      ...baseEnv,
      SENTRY_ENABLED: 'FALSE',
    });

    expect(config.SENTRY_ENABLED).toBe(false);
  });

  it('rejects invalid Sentry sample rates', () => {
    expect(() =>
      validate({
        ...baseEnv,
        SENTRY_TRACES_SAMPLE_RATE: '1.5',
      }),
    ).toThrow();
  });

  it.each([
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'REDIS_URL',
  ])('requires %s explicitly in production', (variableName) => {
    expect(() =>
      validate(
        createProductionEnv({
          [variableName]: undefined,
        }),
      ),
    ).toThrow(`${variableName} is required in production.`);
  });

  it('rejects blank production infrastructure values and port zero', () => {
    expect(() => validate(createProductionEnv({ DB_PASSWORD: '   ' }))).toThrow(
      'DB_PASSWORD is required in production.',
    );
    expect(() => validate(createProductionEnv({ PORT: 0 }))).toThrow(
      'PORT must be at least 1 in production.',
    );
  });

  it('rejects fractional discrete environment values', () => {
    expect(() =>
      validate({
        ...baseEnv,
        DB_RETRY_ATTEMPTS: 1.5,
      }),
    ).toThrow();
    expect(() =>
      validate({
        ...baseEnv,
        CORS_MAX_AGE: 1.5,
      }),
    ).toThrow();
  });

  it('requires JSON logging in production', () => {
    expect(() =>
      validate(createProductionEnv({ LOGGER_JSON: 'false' })),
    ).toThrow('LOGGER_JSON must be true in production.');
  });

  it.each([
    'null',
    'ftp://app.example.com',
    'https://app.example.com/path',
    'https://app.example.com/',
  ])('rejects non-canonical CORS origin %s', (origin) => {
    expect(() =>
      validate({
        ...baseEnv,
        CORS_ORIGINS: origin,
      }),
    ).toThrow('CORS_ORIGINS entries must be canonical HTTP(S) origins.');
  });

  it('rejects empty or unsafe CORS method and header lists at startup', () => {
    expect(() =>
      validate({
        ...baseEnv,
        CORS_METHODS: ' , ',
      }),
    ).toThrow('CORS_METHODS must contain one or more HTTP tokens.');
    expect(() =>
      validate({
        ...baseEnv,
        CORS_METHODS: 'GET\nPOST',
      }),
    ).toThrow('CORS_METHODS must contain one or more HTTP tokens.');
    expect(() =>
      validate({
        ...baseEnv,
        CORS_ALLOWED_HEADERS: 'content-type,bad header',
      }),
    ).toThrow('CORS_ALLOWED_HEADERS entries must be valid HTTP header names.');
    expect(() =>
      validate({
        ...baseEnv,
        CORS_EXPOSED_HEADERS: 'x-request-id,bad\nheader',
      }),
    ).toThrow('CORS_EXPOSED_HEADERS entries must be valid HTTP header names.');
  });

  it('rejects public examples and reused production secrets', () => {
    expect(() =>
      validate(
        createProductionEnv({
          JWT_SECRET: 'public-example-secret-that-must-never-be-used',
        }),
      ),
    ).toThrow('JWT_SECRET must not use a public example value in production.');

    const sharedSecret = randomBytes(48).toString('base64url');

    expect(() =>
      validate(
        createProductionEnv({
          JWT_SECRET: sharedSecret,
          HMAC_SECRET: sharedSecret,
        }),
      ),
    ).toThrow(
      'JWT_SECRET and HMAC_SECRET must use distinct production secrets.',
    );
  });
});
