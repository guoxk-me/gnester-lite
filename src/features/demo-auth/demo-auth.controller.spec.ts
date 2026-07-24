// CN: 测试文件，验证 demo-auth 的行为契约；EN: Test file verifies behavior contracts for demo-auth.
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../common/auth/guards/local-auth.guard';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';

// CN: 测试分组：DemoAuthController；EN: Test group: DemoAuthController.
describe('DemoAuthController', () => {
  const service: jest.Mocked<
    Pick<DemoAuthService, 'getScenarios' | 'login' | 'getProfile'>
  > = {
    getScenarios: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  };
  let controller: DemoAuthController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoAuthController],
      providers: [
        {
          provide: DemoAuthService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<DemoAuthController>(DemoAuthController);
  });

  // CN: 测试用例：delegates public scenario listing to the service；EN: Test case: delegates public scenario listing to the service.
  it('delegates public scenario listing to the service', () => {
    const scenarios = [
      {
        name: 'Passport local login + JWT bearer API',
        method: 'POST / GET',
        route: '/demo-auth/login -> /demo-auth/profile',
        useCase: 'Protect stateless API requests with access tokens.',
        nestPattern:
          'Use LocalAuthGuard and JwtAuthGuard with Passport strategies.',
      },
    ];
    service.getScenarios.mockReturnValueOnce(scenarios);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates Passport-authenticated login requests to the service；EN: Test case: delegates Passport-authenticated login requests to the service.
  it('delegates Passport-authenticated login requests to the service', async () => {
    const user = {
      id: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read', 'demo:read'],
    };
    service.login.mockResolvedValueOnce({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    });

    await expect(
      controller.login(
        { username: 'admin@example.com', password: 'admin12345' },
        { user },
      ),
    ).resolves.toEqual({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    });
    expect(service.login).toHaveBeenCalledWith(user);
  });

  // CN: 测试用例：returns the authenticated profile from the verified JWT payload；EN: Test case: returns the authenticated profile from the verified JWT payload.
  it('returns the authenticated profile from the verified JWT payload', () => {
    const user = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
    };
    service.getProfile.mockReturnValueOnce(user);

    expect(controller.getProfile(user)).toEqual(user);
    expect(service.getProfile).toHaveBeenCalledWith(user);
  });
});
