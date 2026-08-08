import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Environment } from 'config/config.types';
import {
  DEMO_PREFERENCES_COOKIE,
  DEMO_SESSION_COOKIE,
  DemoCookiesService,
} from './demo-cookies.service';

describe('DemoCookiesService', () => {
  const configService: jest.Mocked<Pick<ConfigService, 'get'>> = {
    get: jest.fn(),
  };
  let service: DemoCookiesService;

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

  it('reads only the browser-readable demo preference cookie', () => {
    const cookies = {
      demo_preferences: { theme: 'system' },
      security_cookie: 'must-not-be-reflected',
    };

    expect(service.read(cookies)).toEqual({
      found: true,
      value: {
        demo_preferences: { theme: 'system' },
      },
    });
  });

  it('returns null when the preference cookie is absent', () => {
    expect(service.read({}, DEMO_PREFERENCES_COOKIE)).toEqual({
      name: DEMO_PREFERENCES_COOKIE,
      found: false,
      value: null,
    });
  });

  it('rejects arbitrary named cookie reflection', () => {
    expect(() =>
      service.read(
        {
          security_cookie: 'must-not-be-reflected',
        },
        'security_cookie',
      ),
    ).toThrow(BadRequestException);
  });

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

  it('fails signed cookie creation when COOKIE_SECRET is not configured', () => {
    expect(() => service.createSignedSessionCookie(undefined)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('uses secure cookies in production', () => {
    configService.get.mockReturnValue(Environment.Production);

    const cookie = service.createPreferencesCookie({ theme: 'system' });

    expect(cookie.options.secure).toBe(true);
  });

  it('creates matching clear options for the signed session cookie', () => {
    const cookie = service.createClearSessionCookie();

    expect(cookie.name).toBe(DEMO_SESSION_COOKIE);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      path: '/demo-cookies',
      sameSite: 'lax',
    });
    expect(cookie.options.signed).toBeUndefined();
    expect(cookie.dto).toMatchObject({
      action: 'clear',
      signed: true,
    });
  });
});
