import assert from 'node:assert/strict';
import test from 'node:test';
import { inspect } from 'node:util';

import {
  assertDisposableInfrastructure,
  integrationEnvironment,
  productionVerificationEnvironment,
} from './run-destructive-integration.mjs';

const safeEnvironment = {
  GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION: 'true',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USERNAME: 'application',
  DB_PASSWORD: 'runtime-only-password',
  DB_DATABASE: 'gnester_test',
  REDIS_URL: 'redis://localhost:6379',
};

test('fails closed without opt-in or disposable loopback targets', () => {
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION: 'false',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_HOST: 'database.internal',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_DATABASE: 'gnester',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      REDIS_URL: 'redis://redis.internal:6379',
    }),
  );
  assert.doesNotThrow(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_HOST: '::1',
      REDIS_URL: 'redis://[::1]:6379',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_PORT: '3306.5',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_USERNAME: '',
    }),
  );
  assert.throws(() =>
    assertDisposableInfrastructure({
      ...safeEnvironment,
      DB_PASSWORD: '',
    }),
  );
  assert.doesNotThrow(() => assertDisposableInfrastructure(safeEnvironment));
});

test('forces deterministic integration-only runtime switches', () => {
  assert.deepEqual(
    integrationEnvironment({
      CSRF_ENABLED: 'true',
      SESSION_ENABLED: 'true',
      SENTRY_ENABLED: 'true',
    }),
    {
      NODE_ENV: 'provision',
      CORS_ENABLED: 'false',
      CSRF_ENABLED: 'false',
      DB_AUTO_LOAD_ENTITIES: 'true',
      DB_SYNCHRONIZE: 'false',
      SESSION_ENABLED: 'false',
      SENTRY_ENABLED: 'false',
    },
  );
});

test('uses production assembly for the emitted-entry smoke test', () => {
  assert.deepEqual(
    productionVerificationEnvironment({
      SESSION_ENABLED: 'true',
      SENTRY_ENABLED: 'true',
    }),
    {
      NODE_ENV: 'production',
      CORS_ENABLED: 'false',
      CSRF_ENABLED: 'false',
      DB_AUTO_LOAD_ENTITIES: 'true',
      DB_SYNCHRONIZE: 'false',
      SESSION_ENABLED: 'false',
      SENTRY_ENABLED: 'false',
    },
  );
});

test('does not expose malformed Redis URL credentials in validation errors', () => {
  const credentialSentinel = 'integration-secret-sentinel';
  let validationError;

  try {
    assertDisposableInfrastructure({
      ...safeEnvironment,
      REDIS_URL: `redis://user:${credentialSentinel}@[invalid`,
    });
  } catch (error) {
    validationError = error;
  }

  assert.ok(validationError instanceof Error);
  assert.match(
    validationError.message,
    /valid redis:\/\/ or rediss:\/\/ loopback URL/,
  );
  assert.doesNotMatch(inspect(validationError), new RegExp(credentialSentinel));
});
