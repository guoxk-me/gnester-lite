// CN: 测试文件，验证 demo-auth 的行为契约；EN: Test file verifies behavior contracts for demo-auth.
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

  // CN: 测试用例：returns a local user for valid demo credentials；EN: Test case: returns a local user for valid demo credentials.
  it('returns a local user for valid demo credentials', async () => {
    await expect(
      service.validateUser('admin@example.com', 'admin12345'),
    ).resolves.toEqual({
      id: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read', 'demo:read'],
    });
  });

  // CN: 测试用例：returns null for invalid demo credentials；EN: Test case: returns null for invalid demo credentials.
  it('returns null for invalid demo credentials', async () => {
    await expect(
      service.validateUser('admin@example.com', 'wrong'),
    ).resolves.toBeNull();
  });

  // CN: 测试用例：issues an access token for a Passport-validated user；EN: Test case: issues an access token for a Passport-validated user.
  it('issues an access token for a Passport-validated user', async () => {
    await expect(
      service.login({
        id: 'demo-admin',
        username: 'admin@example.com',
        roles: ['admin'],
        permissions: ['audit:read', 'demo:read'],
      }),
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

  // CN: 测试用例：describes common authentication scenarios for template users；EN: Test case: describes common authentication scenarios for template users.
  it('describes common authentication scenarios for template users', () => {
    expect(service.getScenarios()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Passport local login + JWT bearer API',
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
