import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const jwtSecret = '0123456789abcdef0123456789abcdef';
  const configService = new ConfigService({
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_TOKEN_TTL: '1h',
    JWT_ISSUER: 'gnester-lite',
    JWT_AUDIENCE: 'gnester-clients',
  });
  let service: AuthTokenService;
  let rawJwtService: JwtService;

  beforeEach(() => {
    rawJwtService = new JwtService();
    service = new AuthTokenService(rawJwtService, configService);
  });

  it('signs and verifies access tokens with one claims policy', async () => {
    const token = await service.signAccessToken({
      sub: 'user-1',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read'],
    });

    await expect(service.verifyAccessToken(token)).resolves.toEqual({
      sub: 'user-1',
      username: 'admin@example.com',
      roles: ['admin'],
      permissions: ['audit:read'],
    });
    expect(service.getAccessTokenTtl()).toBe('1h');
  });

  it.each([
    [
      'wrong issuer',
      { issuer: 'another-service', algorithm: 'HS256' as const },
    ],
    [
      'wrong audience',
      { audience: 'another-client', algorithm: 'HS256' as const },
    ],
    ['wrong algorithm', { algorithm: 'HS512' as const }],
  ])('rejects tokens with %s', async (_scenario, overrides) => {
    const token = await rawJwtService.signAsync(
      {
        sub: 'user-1',
        username: 'admin@example.com',
      },
      {
        secret: jwtSecret,
        algorithm: overrides.algorithm,
        issuer: 'issuer' in overrides ? overrides.issuer : 'gnester-lite',
        audience:
          'audience' in overrides ? overrides.audience : 'gnester-clients',
        expiresIn: '15m',
      },
    );

    await expect(service.verifyAccessToken(token)).rejects.toBeDefined();
  });

  it('rejects signed tokens without the required identity claims', async () => {
    const token = await rawJwtService.signAsync(
      {
        username: 'admin@example.com',
      },
      {
        secret: jwtSecret,
        algorithm: 'HS256',
        issuer: 'gnester-lite',
        audience: 'gnester-clients',
        expiresIn: '15m',
      },
    );

    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
