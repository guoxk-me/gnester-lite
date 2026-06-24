// CN: 测试文件，验证 demo-cookies 的行为契约；EN: Test file verifies behavior contracts for demo-cookies.
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Environment } from 'config/config.types';
import {
  DEMO_PREFERENCES_COOKIE,
  DEMO_SESSION_COOKIE,
  DemoCookiesService,
} from './demo-cookies.service';

// CN: 测试分组：DemoCookiesService；EN: Test group: DemoCookiesService.
describe('DemoCookiesService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'get'>> = {
    get: jest.fn(),
  };
  let service: DemoCookiesService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(Environment.Development);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoCookiesService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<DemoCookiesService>(DemoCookiesService);
  });

  // CN: 测试用例：reads all request cookies as the incoming cookie contract；EN: Test case: reads all request cookies as the incoming cookie contract.
  it('reads all request cookies as the incoming cookie contract', () => {
    const cookies = {
      theme: 'dark',
      demo_preferences: { theme: 'system' },
    };

    expect(service.read(cookies)).toEqual({
      found: true,
      value: cookies,
    });
  });

  // CN: 测试用例：returns null when a named request cookie is absent；EN: Test case: returns null when a named request cookie is absent.
  it('returns null when a named request cookie is absent', () => {
    expect(service.read({}, 'missing')).toEqual({
      name: 'missing',
      found: false,
      value: null,
    });
  });

  // CN: 测试用例：creates a browser-readable preference cookie for UI state；EN: Test case: creates a browser-readable preference cookie for UI state.
  it('creates a browser-readable preference cookie for UI state', () => {
    const cookie = service.createPreferencesCookie({
      theme: 'dark',
      locale: 'en-US',
    });

    expect(cookie.name).toBe(DEMO_PREFERENCES_COOKIE);
    expect(cookie.value).toEqual({
      theme: 'dark',
      locale: 'en-US',
    });
    expect(cookie.options).toMatchObject({
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: false,
      signed: false,
    });
    expect(cookie.dto).toMatchObject({
      action: 'set',
      httpOnly: false,
      signed: false,
    });
  });

  // CN: 测试用例：creates an httpOnly signed session cookie when cookie-parser has a secret；EN: Test case: creates an httpOnly signed session cookie when cookie-parser has a secret.
  it('creates an httpOnly signed session cookie when cookie-parser has a secret', () => {
    const cookie = service.createSignedSessionCookie('secret');

    expect(cookie.name).toBe(DEMO_SESSION_COOKIE);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      path: '/demo-cookies',
      sameSite: 'lax',
      secure: false,
      signed: true,
    });
    expect(cookie.dto).toMatchObject({
      action: 'set',
      httpOnly: true,
      signed: true,
    });
  });

  // CN: 测试用例：fails signed cookie creation when COOKIE_SECRET is not configured；EN: Test case: fails signed cookie creation when COOKIE_SECRET is not configured.
  it('fails signed cookie creation when COOKIE_SECRET is not configured', () => {
    expect(() => service.createSignedSessionCookie(undefined)).toThrow(
      ServiceUnavailableException,
    );
  });

  // CN: 测试用例：uses secure cookies in production；EN: Test case: uses secure cookies in production.
  it('uses secure cookies in production', () => {
    configService.get.mockReturnValue(Environment.Production);

    const cookie = service.createPreferencesCookie({ theme: 'system' });

    expect(cookie.options.secure).toBe(true);
  });

  // CN: 测试用例：creates matching clear options for the signed session cookie；EN: Test case: creates matching clear options for the signed session cookie.
  it('creates matching clear options for the signed session cookie', () => {
    const cookie = service.createClearSessionCookie();

    expect(cookie.name).toBe(DEMO_SESSION_COOKIE);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      path: '/demo-cookies',
      sameSite: 'lax',
      signed: true,
    });
    expect(cookie.dto).toMatchObject({
      action: 'clear',
      signed: true,
    });
  });
});
