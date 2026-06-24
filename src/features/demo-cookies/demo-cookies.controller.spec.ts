// CN: 测试文件，验证 demo-cookies 的行为契约；EN: Test file verifies behavior contracts for demo-cookies.
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { DemoCookieWriteDto } from './dto/demo-cookie-write.dto';
import { SetDemoPreferenceCookieDto } from './dto/set-demo-preference-cookie.dto';
import { DemoCookiesController } from './demo-cookies.controller';
import { DemoCookiesService } from './demo-cookies.service';

// CN: 测试分组：DemoCookiesController；EN: Test group: DemoCookiesController.
describe('DemoCookiesController', () => {
  const service: jest.Mocked<
    Pick<
      DemoCookiesService,
      | 'read'
      | 'createPreferencesCookie'
      | 'createSignedSessionCookie'
      | 'createClearSessionCookie'
    >
  > = {
    read: jest.fn(),
    createPreferencesCookie: jest.fn(),
    createSignedSessionCookie: jest.fn(),
    createClearSessionCookie: jest.fn(),
  };
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>>;
  let controller: DemoCookiesController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoCookiesController],
      providers: [
        {
          provide: DemoCookiesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoCookiesController>(DemoCookiesController);
  });

  // CN: 测试用例：delegates all cookie reads to the service；EN: Test case: delegates all cookie reads to the service.
  it('delegates all cookie reads to the service', () => {
    const cookies = { theme: 'dark' };
    service.read.mockReturnValueOnce({
      found: true,
      value: cookies,
    });

    expect(controller.readAll(cookies)).toEqual({
      found: true,
      value: cookies,
    });
    expect(service.read).toHaveBeenCalledWith(cookies);
  });

  // CN: 测试用例：delegates named cookie reads to the service；EN: Test case: delegates named cookie reads to the service.
  it('delegates named cookie reads to the service', () => {
    service.read.mockReturnValueOnce({
      name: 'theme',
      found: true,
      value: 'dark',
    });

    expect(controller.readOne('theme', { theme: 'dark' })).toEqual({
      name: 'theme',
      found: true,
      value: 'dark',
    });
    expect(service.read).toHaveBeenCalledWith({ theme: 'dark' }, 'theme');
  });

  // CN: 测试用例：sets a preference cookie with the service-provided options；EN: Test case: sets a preference cookie with the service-provided options.
  it('sets a preference cookie with the service-provided options', () => {
    const dto: SetDemoPreferenceCookieDto = { theme: 'dark' };
    const writeDto: DemoCookieWriteDto = {
      name: 'demo_preferences',
      action: 'set',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000,
      signed: false,
    };
    service.createPreferencesCookie.mockReturnValueOnce({
      name: 'demo_preferences',
      value: { theme: 'dark' },
      options: { maxAge: 1000 },
      dto: writeDto,
    });

    expect(controller.setPreferences(dto, response as Response)).toEqual(
      writeDto,
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'demo_preferences',
      { theme: 'dark' },
      { maxAge: 1000 },
    );
  });

  // CN: 测试用例：sets a signed session cookie with the request secret；EN: Test case: sets a signed session cookie with the request secret.
  it('sets a signed session cookie with the request secret', () => {
    const writeDto: DemoCookieWriteDto = {
      name: 'demo_session',
      action: 'set',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/demo-cookies',
      signed: true,
    };
    const request = { secret: 'secret' } as Request;
    service.createSignedSessionCookie.mockReturnValueOnce({
      name: 'demo_session',
      value: 'signed-demo-session',
      options: { signed: true },
      dto: writeDto,
    });

    expect(controller.setSignedSession(request, response as Response)).toEqual(
      writeDto,
    );
    expect(service.createSignedSessionCookie).toHaveBeenCalledWith('secret');
    expect(response.cookie).toHaveBeenCalledWith(
      'demo_session',
      'signed-demo-session',
      { signed: true },
    );
  });

  // CN: 测试用例：clears the signed session cookie with matching options；EN: Test case: clears the signed session cookie with matching options.
  it('clears the signed session cookie with matching options', () => {
    const writeDto: DemoCookieWriteDto = {
      name: 'demo_session',
      action: 'clear',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/demo-cookies',
      signed: true,
    };
    service.createClearSessionCookie.mockReturnValueOnce({
      name: 'demo_session',
      options: { path: '/demo-cookies' },
      dto: writeDto,
    });

    expect(controller.clearSignedSession(response as Response)).toEqual(
      writeDto,
    );
    expect(response.clearCookie).toHaveBeenCalledWith('demo_session', {
      path: '/demo-cookies',
    });
  });
});
