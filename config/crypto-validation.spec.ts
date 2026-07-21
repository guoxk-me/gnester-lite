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
  CORS_ORIGINS: 'https://app.example.com',
};

// CN: 测试分组：crypto environment validation；EN: Test group: crypto environment validation.
describe('crypto environment validation', () => {
  // CN: 测试用例：requires crypto secrets in production；EN: Test case: requires crypto secrets in production.
  it('requires crypto secrets in production', () => {
    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: 'jwt-secret',
      }),
    ).toThrow('ENCRYPTION_KEY is required in production.');

    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: 'jwt-secret',
        ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
      }),
    ).toThrow('HMAC_SECRET is required in production.');
  });

  // CN: 测试用例：accepts a 32-byte base64url encryption key；EN: Test case: accepts a 32-byte base64url encryption key.
  it('accepts a 32-byte base64url encryption key', () => {
    const config = validate({
      ...baseEnv,
      ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
      HMAC_SECRET: 'webhook-secret',
    });

    expect(config.ENCRYPTION_KEY).toBe(
      'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY',
    );
    expect(config.HMAC_SECRET).toBe('webhook-secret');
  });

  // CN: 测试用例：rejects encryption keys that are not 32-byte base64url values；EN: Test case: rejects encryption keys that are not 32-byte base64url values.
  it('rejects encryption keys that are not 32-byte base64url values', () => {
    expect(() =>
      validate({
        ...baseEnv,
        ENCRYPTION_KEY: 'short',
      }),
    ).toThrow();
  });
});
