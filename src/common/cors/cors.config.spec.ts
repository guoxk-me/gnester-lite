import { ConfigService } from '@nestjs/config';

import { Environment } from 'config/config.types';
import { createCorsOptions } from './cors.config';

function createConfigService(
  values: Record<string, unknown>,
): ConfigService<Record<string, unknown>, false> {
  return new ConfigService(values);
}

describe('createCorsOptions', () => {
  it('uses explicit origins and credential settings for browser app APIs', () => {
    const configService = createConfigService({
      CORS_ENABLED: true,
      CORS_ORIGINS: 'https://app.example.com, https://admin.example.com',
      CORS_CREDENTIALS: true,
      CORS_METHODS: 'GET,POST,OPTIONS',
      CORS_ALLOWED_HEADERS: 'Content-Type,Authorization',
      CORS_EXPOSED_HEADERS: 'X-Request-Id,Content-Disposition',
      CORS_MAX_AGE: 600,
      CORS_OPTIONS_SUCCESS_STATUS: 200,
    });

    expect(createCorsOptions(configService, Environment.Production)).toEqual({
      origin: ['https://app.example.com', 'https://admin.example.com'],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
      maxAge: 600,
      optionsSuccessStatus: 200,
    });
  });

  it('defaults development CORS to common local frontend origins', () => {
    const configService = createConfigService({
      CORS_ENABLED: true,
    });

    expect(createCorsOptions(configService, Environment.Development)).toEqual(
      expect.objectContaining({
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
        ],
        credentials: true,
      }),
    );
  });

  it('returns false when CORS is explicitly disabled', () => {
    const configService = createConfigService({
      CORS_ENABLED: false,
    });

    expect(createCorsOptions(configService, Environment.Development)).toBe(
      false,
    );
  });

  it('rejects enabled production CORS without explicit origins', () => {
    const configService = createConfigService({
      CORS_ENABLED: true,
    });

    expect(() =>
      createCorsOptions(configService, Environment.Production),
    ).toThrow('CORS_ORIGINS is required when CORS is enabled in production.');
  });

  it('rejects wildcard origins when credentials are enabled', () => {
    const configService = createConfigService({
      CORS_ENABLED: true,
      CORS_ORIGINS: '*',
      CORS_CREDENTIALS: true,
    });

    expect(() =>
      createCorsOptions(configService, Environment.Development),
    ).toThrow('CORS_CREDENTIALS=true cannot be combined with CORS_ORIGINS=*.');
  });

  it('rejects non-canonical and non-HTTP origins when validation is bypassed', () => {
    for (const origin of [
      'null',
      'ftp://app.example.com',
      'https://app.example.com/path',
    ]) {
      const configService = createConfigService({
        CORS_ENABLED: true,
        CORS_ORIGINS: origin,
      });

      expect(() =>
        createCorsOptions(configService, Environment.Development),
      ).toThrow('CORS_ORIGINS entries must be canonical HTTP(S) origins.');
    }
  });
});
