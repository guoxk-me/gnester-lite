import { AuthTokenService } from '../../platform/security/auth/auth-token.service';
import { PasswordHashService } from '../../platform/security/auth/password-hash.service';
import { DemoAuthService } from './demo-auth.service';

describe('DemoAuthService', () => {
  let service: DemoAuthService;
  let authTokenService: jest.Mocked<
    Pick<AuthTokenService, 'signAccessToken' | 'getAccessTokenTtl'>
  >;
  let passwordHashService: jest.Mocked<Pick<PasswordHashService, 'verify'>>;

  beforeEach(() => {
    authTokenService = {
      signAccessToken: jest.fn().mockResolvedValue('signed.jwt.token'),
      getAccessTokenTtl: jest.fn().mockReturnValue('1h'),
    };
    passwordHashService = {
      verify: jest.fn(),
    };
    service = new DemoAuthService(
      authTokenService as unknown as AuthTokenService,
      passwordHashService as unknown as PasswordHashService,
    );
  });

  it('returns a local user for valid demo credentials', async () => {
    passwordHashService.verify.mockResolvedValueOnce(true);

    await expect(
      service.validateUser('admin@example.com', 'admin12345'),
    ).resolves.toEqual({
      id: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read', 'demo:read'],
    });
  });

  it('returns null for invalid demo credentials', async () => {
    passwordHashService.verify.mockResolvedValueOnce(false);

    await expect(
      service.validateUser('admin@example.com', 'wrong'),
    ).resolves.toBeNull();
  });

  it('runs one password verification for an unknown username', async () => {
    passwordHashService.verify.mockResolvedValueOnce(false);

    await expect(
      service.validateUser('missing@example.com', 'wrong'),
    ).resolves.toBeNull();
    expect(passwordHashService.verify).toHaveBeenCalledTimes(1);
    expect(passwordHashService.verify).toHaveBeenCalledWith(
      'wrong',
      expect.stringMatching(/^scrypt\$/),
    );
  });

  it('runs one password verification for a known username', async () => {
    passwordHashService.verify.mockResolvedValueOnce(false);

    await expect(
      service.validateUser('admin@example.com', 'wrong'),
    ).resolves.toBeNull();
    expect(passwordHashService.verify).toHaveBeenCalledTimes(1);
  });

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
      expiresIn: '1h',
    });
    expect(authTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read', 'demo:read'],
    });
    expect(authTokenService.getAccessTokenTtl).toHaveBeenCalled();
  });

  it('returns only public profile identity fields', () => {
    expect(
      service.getProfile({
        sub: 'demo-admin',
        username: 'admin@example.com',
        roles: ['admin'],
        permissions: ['demo:read'],
        iat: 1,
        exp: 2,
        iss: 'internal-issuer',
      }),
    ).toEqual({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
  });

  it('describes common authentication scenarios for template users', () => {
    const scenarios = service.getScenarios();

    expect(scenarios.map(({ name }) => name)).toEqual([
      'Passport local login + JWT bearer API',
      'Current user payload',
    ]);
    expect(scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Passport local login + JWT bearer API',
          route: '/demo-auth/login -> /demo-auth/profile',
        }),
        expect.objectContaining({
          name: 'Current user payload',
          route: '/demo-auth/profile',
        }),
      ]),
    );
  });
});
