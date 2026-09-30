import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';

import { ApplicationAuthService } from './application-auth.service.js';
import type { PasswordHashService } from '../../infra/auth/password-hash.service.js';

// AI modified: exercise token rotation, immediate revocation, and account checks at the persistence boundary.
describe('ApplicationAuthService', () => {
  const account = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    image: null,
    banned: false,
    password: 'stored-hash',
  };
  let session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    rememberMe: boolean;
  } | null;
  let isBanned: boolean;
  let service: ApplicationAuthService;
  let cookies: Map<string, string>;
  let response: Response;

  beforeEach(() => {
    session = null;
    isBanned = false;
    cookies = new Map();
    response = {
      cookie: vi.fn((name: string, token: string) => {
        cookies.set(name, token);
      }),
      clearCookie: vi.fn((name: string) => {
        cookies.delete(name);
      }),
    } as unknown as Response;
    const query = vi.fn(
      async (sql: string, parameters: unknown[] = []): Promise<unknown> => {
        if (sql.includes('JOIN `account`'))
          return [{ ...account, banned: isBanned }];
        if (sql.startsWith('INSERT INTO `session`')) {
          session = {
            id: parameters[0] as string,
            userId: parameters[5] as string,
            token: parameters[2] as string,
            expiresAt: parameters[1] as Date,
            rememberMe: parameters[6] as boolean,
          };
          return undefined;
        }
        if (sql.includes('JOIN `session`')) {
          return session &&
            session.id === parameters[1] &&
            session.userId === parameters[0]
            ? [{ ...account, banned: isBanned }]
            : [];
        }
        if (sql.includes('FOR UPDATE')) return session ? [session] : [];
        if (sql.startsWith('UPDATE `session`')) {
          if (session) {
            session.token = parameters[0] as string;
            session.expiresAt = parameters[1] as Date;
          }
          return undefined;
        }
        if (sql.startsWith('SELECT `id`, `email`'))
          return [{ ...account, banned: isBanned }];
        if (sql.startsWith('DELETE FROM `session`')) {
          if (
            session &&
            session.id === parameters[0] &&
            (parameters.length === 1 || session.token === parameters[1])
          )
            session = null;
          return undefined;
        }
        throw new Error('Unexpected SQL: ' + sql);
      },
    );
    const database = {
      query,
      transaction: (
        action: (manager: { query: typeof query }) => Promise<unknown>,
      ) => action({ query }),
    } as unknown as DataSource;
    const config = {
      get: (key: string, fallback?: unknown) =>
        key === 'JWT_SECRET'
          ? 'test-secret-at-least-32-characters-long'
          : key === 'JWT_ACCESS_TOKEN_TTL'
            ? '1h'
            : key === 'NODE_ENV'
              ? 'test'
              : fallback,
    } as ConfigService;
    const passwords = {
      verify: vi.fn().mockResolvedValue(true),
    } as unknown as PasswordHashService;
    service = new ApplicationAuthService(
      database,
      new JwtService(),
      config,
      passwords,
    );
  });

  it('stores only a refresh digest, rotates it, and rejects a stale token without revoking the current session', async () => {
    const anonymous = { ip: '127.0.0.1', headers: {} } as unknown as Request;
    await expect(
      service.signIn(account.email, 'password123', true, anonymous, response),
    ).resolves.toMatchObject({ id: account.id });
    const firstRefresh = cookies.get('gvueter_refresh');
    const firstAccess = cookies.get('gvueter_access');
    expect(firstRefresh).toBeDefined();
    expect(firstAccess).toBeDefined();
    if (!firstAccess) throw new Error('Missing access cookie');
    const accessClaims = new JwtService().decode(firstAccess) as {
      iat: number;
      exp: number;
    };
    expect(accessClaims.exp - accessClaims.iat).toBe(900);
    expect(session?.token).toMatch(/^rt2:[a-f0-9]{64}$/);
    expect(session?.token).not.toContain(firstRefresh);

    await expect(
      service.requireUser({
        cookies: { gvueter_access: firstAccess },
      } as unknown as Request),
    ).resolves.toMatchObject({ id: account.id });
    await expect(
      service.refresh(
        { cookies: { gvueter_refresh: firstRefresh } } as unknown as Request,
        response,
      ),
    ).resolves.toMatchObject({ id: account.id });
    const secondRefresh = cookies.get('gvueter_refresh');
    expect(secondRefresh).not.toBe(firstRefresh);
    await expect(
      service.refresh(
        { cookies: { gvueter_refresh: firstRefresh } } as unknown as Request,
        response,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(session).not.toBeNull();
    await expect(
      service.refresh(
        { cookies: { gvueter_refresh: secondRefresh } } as unknown as Request,
        response,
      ),
    ).resolves.toMatchObject({ id: account.id });
  });

  it('revokes the database session on logout and refuses a disabled account', async () => {
    await service.signIn(
      account.email,
      'password123',
      false,
      { headers: {} } as unknown as Request,
      response,
    );
    const accessToken = cookies.get('gvueter_access');
    isBanned = true;
    await expect(
      service.requireUser({
        cookies: { gvueter_access: accessToken },
      } as unknown as Request),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    isBanned = false;
    await service.signOut(
      {
        cookies: {
          gvueter_refresh: 'stale.refresh',
          gvueter_access: accessToken,
        },
      } as unknown as Request,
      response,
    );
    expect(session).toBeNull();
    await expect(
      service.requireUser({
        cookies: { gvueter_access: accessToken },
      } as unknown as Request),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
