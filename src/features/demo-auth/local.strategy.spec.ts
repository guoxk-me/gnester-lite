// CN: 测试文件，验证 LocalStrategy 的行为契约；EN: Test file verifies behavior contracts for LocalStrategy.
import { UnauthorizedException } from '@nestjs/common';

import { DemoAuthService } from './demo-auth.service';
import { LocalStrategy } from './local.strategy';

// CN: 测试分组：LocalStrategy；EN: Test group: LocalStrategy.
describe('LocalStrategy', () => {
  const demoAuthService: jest.Mocked<Pick<DemoAuthService, 'validateUser'>> = {
    validateUser: jest.fn(),
  };

  // CN: 测试用例：returns the validated user from DemoAuthService；EN: Test case: returns the validated user from DemoAuthService.
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

  // CN: 测试用例：throws when credentials are invalid；EN: Test case: throws when credentials are invalid.
  it('throws when credentials are invalid', async () => {
    demoAuthService.validateUser.mockResolvedValueOnce(null);
    const strategy = new LocalStrategy(
      demoAuthService as unknown as DemoAuthService,
    );

    await expect(
      strategy.validate('admin@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
