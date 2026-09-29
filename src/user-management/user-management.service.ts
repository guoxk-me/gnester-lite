import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, type QueryRunner } from 'typeorm';
import type { Request } from 'express';

import { BetterAuthService } from '../better-auth/better-auth.service';
import { loadBetterAuthModules } from '../better-auth/better-auth.loader.cjs';

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: number | boolean;
  banned: number | boolean;
  role: string;
  createdAt: Date;
}

interface InvitationRow {
  id: string;
  email: string;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

interface CountRow {
  total: number;
}

interface LockRow {
  acquired: number | string | null;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface InvitationRecord {
  id: string;
  email: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
  sentAt: string;
  expiresAt: string;
}

function publicUser(user: UserRow): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isEmailVerified: Boolean(user.emailVerified),
    status: user.banned ? 'disabled' : 'active',
    createdAt: new Date(user.createdAt).toISOString().slice(0, 10),
  };
}

function publicInvitation(invitation: InvitationRow): InvitationRecord {
  const status = invitation.revokedAt
    ? 'revoked'
    : invitation.acceptedAt
      ? 'accepted'
      : new Date(invitation.expiresAt).getTime() <= Date.now()
        ? 'expired'
        : 'pending';
  return {
    id: invitation.id,
    email: invitation.email,
    status,
    sentAt: new Date(invitation.updatedAt).toISOString().slice(0, 10),
    expiresAt: new Date(invitation.expiresAt).toISOString().slice(0, 10),
  };
}

function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function searchTerm(search: string): string {
  return `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
}

@Injectable()
export class UserManagementService {
  constructor(
    private readonly database: DataSource,
    private readonly betterAuth: BetterAuthService,
  ) {}

  // AI modified: every management request resolves the server cookie and reloads its role from the database.
  async requireAdmin(request: Request): Promise<string> {
    if (!request.headers.cookie) throw new UnauthorizedException();
    const auth = await this.betterAuth.getInstance();
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: request.headers.cookie }),
      query: { disableCookieCache: true },
    });
    if (!session?.user?.id) throw new UnauthorizedException();
    const users = await this.database.query<Pick<UserRow, 'role' | 'banned'>[]>(
      'SELECT `role`, `banned` FROM `user` WHERE `id` = ? LIMIT 1',
      [session.user.id],
    );
    if (
      !users[0] ||
      users[0].banned ||
      !users[0].role.split(',').includes('admin')
    ) {
      throw new ForbiddenException();
    }
    return session.user.id;
  }

  async listUsers(
    search: string,
    status: string,
    pageIndex: number,
    pageSize: number,
  ): Promise<{ rows: UserRecord[]; total: number }> {
    const where: string[] = [];
    const parameters: (string | number)[] = [];
    if (search.trim()) {
      where.push('(`name` LIKE ? OR `email` LIKE ?)');
      parameters.push(searchTerm(search), searchTerm(search));
    }
    if (status === 'active' || status === 'disabled') {
      where.push('`banned` = ?');
      parameters.push(status === 'disabled' ? 1 : 0);
    }
    const condition = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const counts = await this.database.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM \`user\`${condition}`,
      parameters,
    );
    const users = await this.database.query<UserRow[]>(
      `SELECT \`id\`, \`name\`, \`email\`, \`emailVerified\`, \`banned\`, \`role\`, \`createdAt\` FROM \`user\`${condition} ORDER BY \`createdAt\` DESC, \`id\` DESC LIMIT ? OFFSET ?`,
      [...parameters, pageSize, pageIndex * pageSize],
    );
    return {
      rows: users.map(publicUser),
      total: Number(counts[0]?.total ?? 0),
    };
  }

  async createUser(
    name: string,
    email: string,
    password: string,
  ): Promise<UserRecord> {
    return this.insertUser(name, email, password);
  }

  async updateName(userId: string, name: string): Promise<void> {
    const users = await this.database.query<{ id: string }[]>(
      'SELECT `id` FROM `user` WHERE `id` = ?',
      [userId],
    );
    if (!users.length) throw new NotFoundException();
    await this.database.query(
      'UPDATE `user` SET `name` = ?, `updatedAt` = NOW(3) WHERE `id` = ?',
      [name.trim(), userId],
    );
  }

  async updateStatus(
    adminId: string,
    userIds: string[],
    status: 'active' | 'disabled',
  ): Promise<number> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0 || uniqueIds.length > 100)
      throw new BadRequestException('Choose 1–100 users');
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const placeholders = uniqueIds.map(() => '?').join(',');
      const users = (await runner.query(
        `SELECT \`id\`, \`role\` FROM \`user\` WHERE \`id\` IN (${placeholders}) FOR UPDATE`,
        uniqueIds,
      )) as Pick<UserRow, 'id' | 'role'>[];
      if (
        users.length !== uniqueIds.length ||
        users.some(
          (user) =>
            user.id === adminId || user.role.split(',').includes('admin'),
        )
      ) {
        throw new ForbiddenException('Cannot change administrator accounts');
      }
      await runner.query(
        `UPDATE \`user\` SET \`banned\` = ?, \`banReason\` = ?, \`banExpires\` = NULL, \`updatedAt\` = NOW(3) WHERE \`id\` IN (${placeholders})`,
        [
          status === 'disabled' ? 1 : 0,
          status === 'disabled' ? 'Disabled by administrator' : null,
          ...uniqueIds,
        ],
      );
      if (status === 'disabled') {
        await runner.query(
          `DELETE FROM \`session\` WHERE \`userId\` IN (${placeholders})`,
          uniqueIds,
        );
      }
      await runner.commitTransaction();
      return uniqueIds.length;
    } catch (error: unknown) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async listInvitations(
    search: string,
    status: string,
    pageIndex: number,
    pageSize: number,
  ): Promise<{ rows: InvitationRecord[]; total: number }> {
    const where: string[] = [];
    const parameters: (string | number)[] = [];
    if (search.trim()) {
      where.push('`email` LIKE ?');
      parameters.push(searchTerm(search));
    }
    const statuses: Record<string, string> = {
      pending:
        '`acceptedAt` IS NULL AND `revokedAt` IS NULL AND `expiresAt` > NOW(3)',
      expired:
        '`acceptedAt` IS NULL AND `revokedAt` IS NULL AND `expiresAt` <= NOW(3)',
      accepted: '`acceptedAt` IS NOT NULL',
      revoked: '`revokedAt` IS NOT NULL',
    };
    if (statuses[status]) where.push(statuses[status]);
    const condition = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const counts = await this.database.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM \`user_invitation\`${condition}`,
      parameters,
    );
    const invitations = await this.database.query<InvitationRow[]>(
      `SELECT * FROM \`user_invitation\`${condition} ORDER BY \`updatedAt\` DESC, \`id\` DESC LIMIT ? OFFSET ?`,
      [...parameters, pageSize, pageIndex * pageSize],
    );
    return {
      rows: invitations.map(publicInvitation),
      total: Number(counts[0]?.total ?? 0),
    };
  }

  async createInvitation(
    adminId: string,
    email: string,
  ): Promise<{ invitation: InvitationRecord; token: string }> {
    const address = email.trim().toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const invitationId = randomUUID();
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      // AI modified: all writes for one email share a connection lock before entering InnoDB transactions.
      await this.acquireAccountEmailLock(runner, address);
      await runner.startTransaction();
      const users = (await runner.query(
        'SELECT `id` FROM `user` WHERE `email` = ? LIMIT 1',
        [address],
      )) as { id: string }[];
      if (users.length) throw new ConflictException('Account already exists');
      await runner.query(
        'UPDATE `user_invitation` SET `revokedAt` = NOW(3), `updatedAt` = NOW(3) WHERE `email` = ? AND `acceptedAt` IS NULL AND `revokedAt` IS NULL AND `expiresAt` <= NOW(3)',
        [address],
      );
      const pending = (await runner.query(
        'SELECT `id` FROM `user_invitation` WHERE `email` = ? AND `acceptedAt` IS NULL AND `revokedAt` IS NULL LIMIT 1',
        [address],
      )) as { id: string }[];
      if (pending.length)
        throw new ConflictException('Invitation already pending');
      await runner.query(
        'INSERT INTO `user_invitation` (`id`, `email`, `tokenHash`, `invitedBy`, `expiresAt`) VALUES (?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL 7 DAY))',
        [invitationId, address, tokenDigest(token), adminId],
      );
      const invitations = (await runner.query(
        'SELECT * FROM `user_invitation` WHERE `id` = ?',
        [invitationId],
      )) as InvitationRow[];
      await runner.commitTransaction();
      return { invitation: publicInvitation(invitations[0]), token };
    } catch (error: unknown) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Invitation already pending');
      }
      throw error;
    } finally {
      try {
        await this.releaseAccountEmailLock(runner, address);
      } finally {
        await runner.release();
      }
    }
  }

  async resendInvitation(
    invitationId: string,
  ): Promise<{ invitation: InvitationRecord; token: string }> {
    const token = randomBytes(32).toString('base64url');
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const invitations = (await runner.query(
        'SELECT * FROM `user_invitation` WHERE `id` = ? FOR UPDATE',
        [invitationId],
      )) as InvitationRow[];
      const invitation = invitations[0];
      if (!invitation) throw new NotFoundException();
      if (invitation.acceptedAt || invitation.revokedAt)
        throw new ConflictException('Invitation is closed');
      await runner.query(
        'UPDATE `user_invitation` SET `tokenHash` = ?, `expiresAt` = DATE_ADD(NOW(3), INTERVAL 7 DAY), `updatedAt` = NOW(3) WHERE `id` = ?',
        [tokenDigest(token), invitationId],
      );
      const updated = (await runner.query(
        'SELECT * FROM `user_invitation` WHERE `id` = ?',
        [invitationId],
      )) as InvitationRow[];
      await runner.commitTransaction();
      return { invitation: publicInvitation(updated[0]), token };
    } catch (error: unknown) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // AI modified: revocation and acceptance serialize on the invitation row.
      const invitations = (await runner.query(
        'SELECT * FROM `user_invitation` WHERE `id` = ? FOR UPDATE',
        [invitationId],
      )) as InvitationRow[];
      if (
        !invitations[0] ||
        invitations[0].acceptedAt ||
        invitations[0].revokedAt
      ) {
        throw new NotFoundException();
      }
      await runner.query(
        'UPDATE `user_invitation` SET `revokedAt` = NOW(3), `updatedAt` = NOW(3) WHERE `id` = ?',
        [invitationId],
      );
      await runner.commitTransaction();
    } catch (error: unknown) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async getInvitation(
    token: string,
  ): Promise<{ email: string; expiresAt: string }> {
    const invitations = await this.database.query<InvitationRow[]>(
      'SELECT * FROM `user_invitation` WHERE `tokenHash` = ? LIMIT 1',
      [tokenDigest(token)],
    );
    const invitation = invitations[0];
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      new Date(invitation.expiresAt).getTime() <= Date.now()
    )
      throw new NotFoundException('Invitation is unavailable');
    return {
      email: invitation.email,
      expiresAt: new Date(invitation.expiresAt).toISOString(),
    };
  }

  async acceptInvitation(
    token: string,
    name: string,
    password: string,
  ): Promise<void> {
    const passwordHash = await this.passwordHash(password);
    const { email } = await this.getInvitation(token);
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await this.acquireAccountEmailLock(runner, email);
      await runner.startTransaction();
      // AI modified: a row lock makes invitation consumption and account creation one transaction.
      const invitations = (await runner.query(
        'SELECT * FROM `user_invitation` WHERE `tokenHash` = ? FOR UPDATE',
        [tokenDigest(token)],
      )) as InvitationRow[];
      const invitation = invitations[0];
      if (
        !invitation ||
        invitation.revokedAt ||
        invitation.acceptedAt ||
        new Date(invitation.expiresAt).getTime() <= Date.now()
      )
        throw new NotFoundException('Invitation is unavailable');
      await this.insertCredentials(
        runner,
        name,
        invitation.email,
        passwordHash,
      );
      await runner.query(
        'UPDATE `user_invitation` SET `acceptedAt` = NOW(3), `updatedAt` = NOW(3) WHERE `id` = ?',
        [invitation.id],
      );
      await runner.commitTransaction();
    } catch (error: unknown) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      this.throwConflictForDuplicateEmail(error);
      throw error;
    } finally {
      try {
        await this.releaseAccountEmailLock(runner, email);
      } finally {
        await runner.release();
      }
    }
  }

  private async insertUser(
    name: string,
    email: string,
    password: string,
  ): Promise<UserRecord> {
    const passwordHash = await this.passwordHash(password);
    const address = email.trim().toLowerCase();
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await this.acquireAccountEmailLock(runner, address);
      await runner.startTransaction();
      const userId = await this.insertCredentials(
        runner,
        name,
        address,
        passwordHash,
      );
      // AI modified: direct account creation closes any link that would now point to an existing account.
      await runner.query(
        'UPDATE `user_invitation` SET `revokedAt` = NOW(3), `updatedAt` = NOW(3) WHERE `email` = ? AND `acceptedAt` IS NULL AND `revokedAt` IS NULL',
        [address],
      );
      const users = (await runner.query(
        'SELECT `id`, `name`, `email`, `emailVerified`, `banned`, `role`, `createdAt` FROM `user` WHERE `id` = ?',
        [userId],
      )) as UserRow[];
      await runner.commitTransaction();
      return publicUser(users[0]);
    } catch (error: unknown) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      this.throwConflictForDuplicateEmail(error);
      throw error;
    } finally {
      try {
        await this.releaseAccountEmailLock(runner, address);
      } finally {
        await runner.release();
      }
    }
  }

  private async acquireAccountEmailLock(
    runner: QueryRunner,
    email: string,
  ): Promise<void> {
    const lockName = this.accountEmailLockName(email);
    const locks = (await runner.query('SELECT GET_LOCK(?, 10) AS acquired', [
      lockName,
    ])) as LockRow[];
    if (Number(locks[0]?.acquired) !== 1) {
      throw new ServiceUnavailableException('Account email is busy');
    }
  }

  private async releaseAccountEmailLock(
    runner: QueryRunner,
    email: string,
  ): Promise<void> {
    await runner.query('SELECT RELEASE_LOCK(?)', [
      this.accountEmailLockName(email),
    ]);
  }

  private accountEmailLockName(email: string): string {
    return `gnester:account:${tokenDigest(email).slice(0, 40)}`;
  }

  private async insertCredentials(
    runner: QueryRunner,
    name: string,
    email: string,
    passwordHash: string,
  ): Promise<string> {
    const userId = randomUUID();
    await runner.query(
      'INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`, `banned`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, false, ?, false, NOW(3), NOW(3))',
      [userId, name.trim(), email, 'user'],
    );
    await runner.query(
      'INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))',
      [randomUUID(), userId, 'credential', userId, passwordHash],
    );
    return userId;
  }

  private async passwordHash(password: string): Promise<string> {
    const { hashPassword } = await loadBetterAuthModules();
    return hashPassword(password);
  }

  private throwConflictForDuplicateEmail(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('Account already exists');
    }
  }
}
