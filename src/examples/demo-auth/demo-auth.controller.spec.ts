import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../platform/security/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';

describe('DemoAuthController', () => {
  const service: jest.Mocked<
    Pick<DemoAuthService, 'getScenarios' | 'login' | 'getProfile'>
  > = {
    getScenarios: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  };
  let controller: DemoAuthController;

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

  it('applies a credential-specific throttle budget to login', () => {
    const loginHandler = Object.getOwnPropertyDescriptor(
      DemoAuthController.prototype,
      'login',
    )?.value as object;

    expect(Reflect.getMetadata('THROTTLER:LIMITshort', loginHandler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLshort', loginHandler)).toBe(
      60_000,
    );
  });

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
