// CN: 测试文件，验证 cors common 的行为契约；EN: Test file verifies behavior contracts for cors common.
import { ConfigService } from '@nestjs/config';

import { Environment } from 'config/config.types';
import { createCorsOptions } from './cors.config';

// CN: 准备或验证 cors common 的 create config service 测试逻辑；EN: Prepares or verifies the create config service test logic for cors common.
function createConfigService(
  values: Record<string, unknown>,
): ConfigService<Record<string, unknown>, false> {
  return new ConfigService(values);
}

// CN: 测试分组：createCorsOptions；EN: Test group: createCorsOptions.
describe('createCorsOptions', () => {
  // CN: 测试用例：uses explicit origins and credential settings for browser app APIs；EN: Test case: uses explicit origins and credential settings for browser app APIs.
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

  // CN: 测试用例：defaults development CORS to common local frontend origins；EN: Test case: defaults development CORS to common local frontend origins.
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

  // CN: 测试用例：returns false when CORS is explicitly disabled；EN: Test case: returns false when CORS is explicitly disabled.
  it('returns false when CORS is explicitly disabled', () => {
    const configService = createConfigService({
      CORS_ENABLED: false,
    });

    expect(createCorsOptions(configService, Environment.Development)).toBe(
      false,
    );
  });

  // CN: 测试用例：rejects enabled production CORS without explicit origins；EN: Test case: rejects enabled production CORS without explicit origins.
  it('rejects enabled production CORS without explicit origins', () => {
    const configService = createConfigService({
      CORS_ENABLED: true,
    });

    expect(() =>
      createCorsOptions(configService, Environment.Production),
    ).toThrow('CORS_ORIGINS is required when CORS is enabled in production.');
  });

  // CN: 测试用例：rejects wildcard origins when credentials are enabled；EN: Test case: rejects wildcard origins when credentials are enabled.
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
});
