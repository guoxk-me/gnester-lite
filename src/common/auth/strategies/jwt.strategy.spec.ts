// CN: 测试文件，验证 JwtStrategy 的行为契约；EN: Test file verifies behavior contracts for JwtStrategy.
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';

// CN: 测试分组：JwtStrategy；EN: Test group: JwtStrategy.
describe('JwtStrategy', () => {
  // CN: 测试用例：maps a verified JWT payload onto request.user fields；EN: Test case: maps a verified JWT payload onto request.user fields.
  it('maps a verified JWT payload onto request.user fields', () => {
    const strategy = new JwtStrategy({
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }

        return fallback;
      }),
    } as unknown as ConfigService);

    expect(
      strategy.validate({
        sub: 'demo-admin',
        username: 'admin@example.com',
        roles: ['admin'],
        permissions: ['demo:read'],
        iat: 1,
        exp: 2,
      }),
    ).toEqual({
      sub: 'demo-admin',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['demo:read'],
    });
  });
});
