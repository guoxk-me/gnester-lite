// CN: 测试文件，验证 demo-auth 的行为契约；EN: Test file verifies behavior contracts for demo-auth.
import { UnauthorizedException } from '@nestjs/common';

import { AuthTokenService } from '../../common/auth/auth-token.service';
import { PasswordHashService } from '../../common/auth/password-hash.service';
import { DemoAuthService } from './demo-auth.service';

// CN: 测试分组：DemoAuthService；EN: Test group: DemoAuthService.
describe('DemoAuthService', () => {
  let service: DemoAuthService;
  let authTokenService: jest.Mocked<Pick<AuthTokenService, 'signAccessToken'>>;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    authTokenService = {
      signAccessToken: jest.fn().mockResolvedValue('signed.jwt.token'),
    };
    service = new DemoAuthService(
      authTokenService as AuthTokenService,
      new PasswordHashService(),
    );
  });

  // CN: 测试用例：returns an access token for valid demo credentials；EN: Test case: returns an access token for valid demo credentials.
  it('returns an access token for valid demo credentials', async () => {
    await expect(
      service.signIn({ username: 'admin@example.com', password: 'admin12345' }),
    ).resolves.toEqual({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: '15m',
    });
    expect(authTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read', 'demo:read'],
    });
  });

  // CN: 测试用例：rejects invalid demo credentials without signing a token；EN: Test case: rejects invalid demo credentials without signing a token.
  it('rejects invalid demo credentials without signing a token', async () => {
    await expect(
      service.signIn({ username: 'admin@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authTokenService.signAccessToken).not.toHaveBeenCalled();
  });

  // CN: 测试用例：describes common authentication scenarios for template users；EN: Test case: describes common authentication scenarios for template users.
  it('describes common authentication scenarios for template users', () => {
    expect(service.getScenarios()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'JWT bearer API',
          route: '/demo-auth/login -> /demo-auth/profile',
        }),
        expect.objectContaining({
          name: 'Public route escape hatch',
          nestPattern: '@Public() marks endpoints that bypass AuthGuard.',
        }),
      ]),
    );
  });
});
