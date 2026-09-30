import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';

import type { AccountRow, SessionRow } from './session-persistence.types.js';
import type { SessionUser } from './session.types.js';
import { Environment } from '../../config/config-enums.js';
import { readJwtPolicy } from '../../infra/auth/jwt-policy.js';
import { PasswordHashService } from '../../infra/auth/password-hash.service.js';

const ACCESS_COOKIE = 'gvueter_access';
const REFRESH_COOKIE = 'gvueter_refresh';
const ACCESS_TOKEN_TTL = '15m';
const ACCESS_COOKIE_AGE_MS = 15 * 60 * 1000;
const REMEMBERED_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BROWSER_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_ACCOUNT_HASH = `scrypt$unknown-account$${Buffer.alloc(64).toString('base64url')}`;

function refreshDigest(token: string): string {
  return `rt2:${createHash('sha256').update(token).digest('hex')}`;
}

function requestCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  return typeof cookies?.[name] === 'string' ? cookies[name] : undefined;
}

@Injectable()
export class ApplicationAuthService {
  constructor(
    private readonly database: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordHashService,
  ) {}

  // AI modified: application credentials remain independent of Better Auth's runtime.
  async signIn(
    email: string,
    password: string,
    rememberMe: boolean,
    request: Request,
    response: Response,
  ): Promise<SessionUser> {
    const accounts = await this.database.query<AccountRow[]>(
      'SELECT u.`id`, u.`email`, u.`name`, u.`image`, u.`banned`, a.`password` FROM `user` u JOIN `account` a ON a.`userId` = u.`id` AND a.`providerId` = ? WHERE u.`email` = ? LIMIT 1',
      ['credential', email.trim().toLowerCase()],
    );
    const account = accounts[0];
    // AI modified: unknown and disabled accounts still perform a password check before the same 401.
    const isPasswordValid = await this.passwords.verify(
      password,
      account?.password ?? UNKNOWN_ACCOUNT_HASH,
    );
    if (
      !account ||
      Boolean(account.banned) ||
      !account.password ||
      !isPasswordValid
    ) {
      throw new UnauthorizedException();
    }

    const sessionId = randomUUID();
    const refreshToken = `${sessionId}.${randomBytes(32).toString('base64url')}`;
    const lifetime = rememberMe
      ? REMEMBERED_SESSION_AGE_MS
      : BROWSER_SESSION_AGE_MS;
    await this.database.query(
      'INSERT INTO `session` (`id`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId`, `rememberMe`) VALUES (?, ?, ?, NOW(3), NOW(3), ?, ?, ?, ?)',
      [
        sessionId,
        new Date(Date.now() + lifetime),
        refreshDigest(refreshToken),
        request.ip ?? null,
        request.headers['user-agent'] ?? null,
        account.id,
        rememberMe,
      ],
    );
    await this.setCookies(
      response,
      account.id,
      sessionId,
      refreshToken,
      rememberMe,
    );
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      image: account.image,
    };
  }

  // AI modified: every protected request checks both the signed access token and live account state.
  async requireUser(request: Request): Promise<SessionUser> {
    const token = requestCookie(request, ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException();
    const policy = readJwtPolicy(this.config);
    let claims: Record<string, unknown>;
    try {
      claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: policy.secret,
        algorithms: [policy.algorithm],
        issuer: policy.issuer,
        audience: policy.audience,
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (
      claims.kind !== 'application-access' ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string'
    ) {
      throw new UnauthorizedException();
    }
    const users = await this.database.query<
      (SessionUser & { banned: boolean | number })[]
    >(
      'SELECT u.`id`, u.`email`, u.`name`, u.`image`, u.`banned` FROM `user` u JOIN `session` s ON s.`userId` = u.`id` WHERE u.`id` = ? AND s.`id` = ? AND s.`token` LIKE ? AND s.`expiresAt` > NOW(3) LIMIT 1',
      [claims.sub, claims.sid, 'rt2:%'],
    );
    const user = users[0];
    if (!user || Boolean(user.banned)) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  }

  async refresh(request: Request, response: Response): Promise<SessionUser> {
    const previousToken = requestCookie(request, REFRESH_COOKIE);
    const sessionId = previousToken?.split('.', 1)[0];
    if (!previousToken || !sessionId) throw new UnauthorizedException();
    const nextToken = `${sessionId}.${randomBytes(32).toString('base64url')}`;
    const session = await this.database.transaction(async (manager) => {
      const sessions = await manager.query<SessionRow[]>(
        'SELECT `id`, `userId`, `token`, `expiresAt`, `rememberMe` FROM `session` WHERE `id` = ? FOR UPDATE',
        [sessionId],
      );
      const current = sessions[0];
      if (!current || !current.token.startsWith('rt2:')) return null;
      const expected = Buffer.from(current.token);
      const presented = Buffer.from(refreshDigest(previousToken));
      if (
        expected.length !== presented.length ||
        !timingSafeEqual(expected, presented)
      ) {
        // AI modified: stale tokens are rejected without revoking a session refreshed by another tab.
        return null;
      }
      if (new Date(current.expiresAt).getTime() <= Date.now()) {
        await manager.query('DELETE FROM `session` WHERE `id` = ?', [
          sessionId,
        ]);
        return null;
      }
      const isRemembered = Boolean(current.rememberMe);
      const expiresAt = isRemembered
        ? new Date(Date.now() + REMEMBERED_SESSION_AGE_MS)
        : current.expiresAt;
      await manager.query(
        'UPDATE `session` SET `token` = ?, `expiresAt` = ?, `updatedAt` = NOW(3) WHERE `id` = ?',
        [refreshDigest(nextToken), expiresAt, sessionId],
      );
      return { userId: current.userId, isRemembered };
    });
    if (!session) throw new UnauthorizedException();
    const users = await this.database.query<
      (SessionUser & { banned: boolean | number })[]
    >(
      'SELECT `id`, `email`, `name`, `image`, `banned` FROM `user` WHERE `id` = ? LIMIT 1',
      [session.userId],
    );
    const user = users[0];
    if (!user || Boolean(user.banned)) {
      await this.database.query('DELETE FROM `session` WHERE `id` = ?', [
        sessionId,
      ]);
      throw new UnauthorizedException();
    }
    await this.setCookies(
      response,
      user.id,
      sessionId,
      nextToken,
      session.isRemembered,
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  }

  async signOut(request: Request, response: Response): Promise<void> {
    const token = requestCookie(request, REFRESH_COOKIE);
    const sessionId = token?.split('.', 1)[0];
    if (token && sessionId) {
      await this.database.query(
        'DELETE FROM `session` WHERE `id` = ? AND `token` = ?',
        [sessionId, refreshDigest(token)],
      );
    }
    // AI modified: a stale refresh cookie must not leave a still-live access session behind.
    const accessToken = requestCookie(request, ACCESS_COOKIE);
    if (accessToken) {
      let accessSessionId: string | undefined;
      try {
        const policy = readJwtPolicy(this.config);
        const claims = await this.jwt.verifyAsync<Record<string, unknown>>(
          accessToken,
          {
            secret: policy.secret,
            algorithms: [policy.algorithm],
            issuer: policy.issuer,
            audience: policy.audience,
          },
        );
        if (
          claims.kind === 'application-access' &&
          typeof claims.sid === 'string'
        )
          accessSessionId = claims.sid;
      } catch {
        // Invalid access credentials have no live session to revoke here.
      }
      if (accessSessionId)
        await this.database.query('DELETE FROM `session` WHERE `id` = ?', [
          accessSessionId,
        ]);
    }
    response.clearCookie(ACCESS_COOKIE, { path: '/api' });
    response.clearCookie(REFRESH_COOKIE, { path: '/api/session' });
  }

  private async setCookies(
    response: Response,
    userId: string,
    sessionId: string,
    refreshToken: string,
    rememberMe: boolean,
  ): Promise<void> {
    const policy = readJwtPolicy(this.config);
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, kind: 'application-access' },
      {
        secret: policy.secret,
        algorithm: policy.algorithm,
        // AI modified: the browser access lifetime is fixed to match its cookie, independent of demo JWT settings.
        expiresIn: ACCESS_TOKEN_TTL,
        issuer: policy.issuer,
        audience: policy.audience,
      },
    );
    const secure =
      this.config.get<Environment>('NODE_ENV') === Environment.Production;
    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api',
      maxAge: ACCESS_COOKIE_AGE_MS,
    });
    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/session',
      ...(rememberMe ? { maxAge: REMEMBERED_SESSION_AGE_MS } : {}),
    });
  }
}
