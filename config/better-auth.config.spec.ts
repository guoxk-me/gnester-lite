import { ConfigService } from '@nestjs/config';

import { Environment } from './config.types';
import {
  BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET,
  isBetterAuthRequestPath,
  readBetterAuthConfig,
} from './better-auth.config';

describe('isBetterAuthRequestPath', () => {
  it.each(['/api/auth', '/api/auth/sign-in/email'])(
    'matches the Better Auth handler boundary %s',
    (requestPath) => {
      expect(isBetterAuthRequestPath(requestPath)).toBe(true);
    },
  );

  it.each(['/api/authentication', '/api/auth-malicious', '/v1/api/auth'])(
    'rejects the adjacent path %s',
    (requestPath) => {
      expect(isBetterAuthRequestPath(requestPath)).toBe(false);
    },
  );
});

describe('readBetterAuthConfig', () => {
  it('provides clone-ready local defaults', () => {
    const config = readBetterAuthConfig(
      new ConfigService({
        NODE_ENV: Environment.Development,
        PORT: 4100,
      }),
    );

    expect(config).toEqual({
      baseURL: 'http://localhost:4100',
      isRateLimitEnabled: true,
      secret: BETTER_AUTH_LOCAL_DEVELOPMENT_SECRET,
      trustedOrigins: [
        'http://localhost:4100',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
      useSecureCookies: false,
    });
  });

  it('uses an explicit Better Auth origin allowlist before CORS origins', () => {
    const config = readBetterAuthConfig(
      new ConfigService({
        NODE_ENV: Environment.Production,
        BETTER_AUTH_SECRET: 'a-production-secret-with-more-than-32-bytes',
        BETTER_AUTH_URL: 'https://api.example.com',
        BETTER_AUTH_TRUSTED_ORIGINS:
          'https://app.example.com,https://admin.example.com',
        CORS_ORIGINS: 'https://ignored.example.com',
      }),
    );

    expect(config.trustedOrigins).toEqual([
      'https://api.example.com',
      'https://app.example.com',
      'https://admin.example.com',
    ]);
    expect(config.useSecureCookies).toBe(true);
  });

  it('falls back to credentialed CORS origins without trusting a wildcard', () => {
    const configuredCors = readBetterAuthConfig(
      new ConfigService({
        NODE_ENV: Environment.Production,
        BETTER_AUTH_URL: 'https://api.example.com',
        CORS_ORIGINS: 'https://app.example.com',
      }),
    );
    const wildcardCors = readBetterAuthConfig(
      new ConfigService({
        NODE_ENV: Environment.Production,
        BETTER_AUTH_URL: 'https://api.example.com',
        CORS_ORIGINS: '*',
      }),
    );

    expect(configuredCors.trustedOrigins).toEqual([
      'https://api.example.com',
      'https://app.example.com',
    ]);
    expect(wildcardCors.trustedOrigins).toEqual(['https://api.example.com']);
  });

  it('does not promote disabled or non-credentialed CORS origins', () => {
    for (const corsConfig of [
      { CORS_ENABLED: false, CORS_CREDENTIALS: true },
      { CORS_ENABLED: true, CORS_CREDENTIALS: false },
    ]) {
      const config = readBetterAuthConfig(
        new ConfigService({
          NODE_ENV: Environment.Production,
          BETTER_AUTH_URL: 'https://api.example.com',
          CORS_ORIGINS: 'https://public.example.com',
          ...corsConfig,
        }),
      );

      expect(config.trustedOrigins).toEqual(['https://api.example.com']);
    }
  });

  it.each([
    'https://api.example.com/path',
    'https://api.example.com/',
    'ftp://api.example.com',
    'not-a-url',
  ])('rejects non-canonical base URL %s', (baseURL) => {
    expect(() =>
      readBetterAuthConfig(
        new ConfigService({
          BETTER_AUTH_URL: baseURL,
        }),
      ),
    ).toThrow('BETTER_AUTH_URL must be a canonical HTTP(S) origin.');
  });

  it('requires non-loopback HTTPS production origins', () => {
    expect(() =>
      readBetterAuthConfig(
        new ConfigService({
          NODE_ENV: Environment.Production,
          BETTER_AUTH_URL: 'http://api.example.com',
        }),
      ),
    ).toThrow(
      'BETTER_AUTH_URL must use a non-loopback HTTPS origin in production.',
    );
    expect(() =>
      readBetterAuthConfig(
        new ConfigService({
          NODE_ENV: Environment.Production,
          BETTER_AUTH_URL: 'https://api.example.com',
          BETTER_AUTH_TRUSTED_ORIGINS: 'http://app.example.com',
        }),
      ),
    ).toThrow(
      'BETTER_AUTH_TRUSTED_ORIGINS must use non-loopback HTTPS origins in production.',
    );

    for (const loopbackURL of [
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      'https://localhost:3000',
      'https://[::1]:3000',
    ]) {
      expect(() =>
        readBetterAuthConfig(
          new ConfigService({
            NODE_ENV: Environment.Production,
            BETTER_AUTH_URL: loopbackURL,
          }),
        ),
      ).toThrow(
        'BETTER_AUTH_URL must use a non-loopback HTTPS origin in production.',
      );
    }
  });

  it('keeps Secure cookies for HTTPS outside production', () => {
    expect(
      readBetterAuthConfig(
        new ConfigService({
          NODE_ENV: Environment.Development,
          BETTER_AUTH_URL: 'https://development.example.com',
        }),
      ).useSecureCookies,
    ).toBe(true);
  });
});
