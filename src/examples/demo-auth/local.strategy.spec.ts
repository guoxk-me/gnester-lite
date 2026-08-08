import { UnauthorizedException } from '@nestjs/common';

import { DemoAuthService } from './demo-auth.service';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  const demoAuthService: jest.Mocked<Pick<DemoAuthService, 'validateUser'>> = {
    validateUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the validated user from DemoAuthService', async () => {
    const user = {
      id: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'] as const,
      permissions: ['demo:read'] as const,
    };
    demoAuthService.validateUser.mockResolvedValueOnce(user);
    const strategy = new LocalStrategy(
      demoAuthService as unknown as DemoAuthService,
    );

    await expect(
      strategy.validate('admin@example.com', 'admin12345'),
    ).resolves.toEqual(user);
  });

  it('throws when credentials are invalid', async () => {
    demoAuthService.validateUser.mockResolvedValueOnce(null);
    const strategy = new LocalStrategy(
      demoAuthService as unknown as DemoAuthService,
    );

    await expect(
      strategy.validate('admin@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects oversized credentials before invoking the password verifier', async () => {
    const strategy = new LocalStrategy(
      demoAuthService as unknown as DemoAuthService,
    );

    await expect(
      strategy.validate('admin@example.com', 'x'.repeat(129)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(demoAuthService.validateUser).not.toHaveBeenCalled();
  });
});
