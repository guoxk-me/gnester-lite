import { ConfigService } from '@nestjs/config';

import type { AuthTokenService } from '../auth-token.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('maps a verified JWT payload onto request.user fields', () => {
    const authenticatedUser = {
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    };
    const validateAccessTokenPayload = vi
      .fn()
      .mockReturnValue(authenticatedUser);
    const strategy = new JwtStrategy(
      {
        get: vi.fn((key: string, fallback?: string) => {
          if (key === 'JWT_SECRET') {
            return 'test-secret';
          }

          return fallback;
        }),
      } as unknown as ConfigService,
      {
        validateAccessTokenPayload,
      } as unknown as AuthTokenService,
    );
    const payload = {
      ...authenticatedUser,
      iat: 1,
      exp: 2,
    };

    expect(strategy.validate(payload)).toEqual(authenticatedUser);
    expect(validateAccessTokenPayload).toHaveBeenCalledWith(payload);
  });
});
