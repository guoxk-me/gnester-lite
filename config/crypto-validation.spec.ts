import 'reflect-metadata';
import { randomBytes } from 'node:crypto';

import { validate } from './validation';

const baseEnv = {
  NODE_ENV: 'development',
  PORT: 3000,
};
const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  DB_HOST: 'database.internal',
  DB_PORT: 3306,
  DB_USERNAME: 'application',
  DB_PASSWORD: randomBytes(24).toString('base64url'),
  DB_DATABASE: 'application',
  REDIS_URL: 'rediss://redis.internal:6379',
  CORS_ORIGINS: 'https://app.example.com',
};

describe('crypto environment validation', () => {
  it('requires crypto secrets in production', () => {
    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: randomBytes(48).toString('base64url'),
      }),
    ).toThrow('ENCRYPTION_KEY is required in production.');

    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: randomBytes(48).toString('base64url'),
        ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
      }),
    ).toThrow('HMAC_SECRET is required in production.');
  });

  it('accepts a 32-byte base64url encryption key', () => {
    const encryptionKey = randomBytes(32).toString('base64url');
    const config = validate({
      ...baseEnv,
      ENCRYPTION_KEY: encryptionKey,
      HMAC_SECRET: 'webhook-secret',
    });

    expect(config.ENCRYPTION_KEY).toBe(encryptionKey);
    expect(config.HMAC_SECRET).toBe('webhook-secret');
  });

  it('rejects encryption keys that are not 32-byte base64url values', () => {
    expect(() =>
      validate({
        ...baseEnv,
        ENCRYPTION_KEY: 'short',
      }),
    ).toThrow();
  });

  it('rejects a repeated-byte encryption placeholder in production', () => {
    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: randomBytes(48).toString('base64url'),
        ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        HMAC_SECRET: randomBytes(48).toString('base64url'),
        CSRF_ENABLED: 'false',
      }),
    ).toThrow(
      'ENCRYPTION_KEY must be a non-placeholder 32-byte base64url value in production.',
    );
  });

  it('rejects a non-canonical encoding of the same encryption key', () => {
    const encryptionKey = randomBytes(32).toString('base64url');
    const base64UrlAlphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const finalCharacter = encryptionKey.at(-1);

    if (!finalCharacter) {
      throw new Error('Generated encryption key was empty.');
    }

    const finalCharacterIndex = base64UrlAlphabet.indexOf(finalCharacter);
    const alternateEncoding = `${encryptionKey.slice(0, -1)}${
      base64UrlAlphabet[finalCharacterIndex + 1]
    }`;

    expect(Buffer.from(alternateEncoding, 'base64url')).toEqual(
      Buffer.from(encryptionKey, 'base64url'),
    );
    expect(() =>
      validate({
        ...productionEnv,
        JWT_SECRET: randomBytes(48).toString('base64url'),
        ENCRYPTION_KEY: alternateEncoding,
        HMAC_SECRET: randomBytes(48).toString('base64url'),
        CSRF_ENABLED: 'false',
      }),
    ).toThrow(
      'ENCRYPTION_KEY must be a non-placeholder 32-byte base64url value in production.',
    );
  });
});
