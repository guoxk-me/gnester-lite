import { createHash } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { DataSource, QueryRunner } from 'typeorm';

import type { PasswordHashService } from '../../infra/auth/password-hash.service.js';
import { UserManagementService } from './user-management.service.js';

const invitation = {
  id: 'invitation-1',
  email: 'invitee@example.com',
  tokenHash: 'digest',
  createdAt: new Date('2026-09-29T00:00:00Z'),
  updatedAt: new Date('2026-09-29T00:00:00Z'),
  expiresAt: new Date('2027-09-29T00:00:00Z'),
  acceptedAt: null,
  revokedAt: null,
};

// AI modified: exercise authorization and one-time invitation writes at the database boundary.
describe('UserManagementService', () => {
  const query = vi.fn<(...args: [string, unknown[]?]) => Promise<unknown>>();
  const domainQuery =
    vi.fn<(...args: [string, unknown[]?]) => Promise<unknown>>();
  const runnerQuery = vi.fn<
    (...args: [string, unknown[]?]) => Promise<unknown>
  >((sql, parameters) => {
    if (sql.includes('GET_LOCK')) return Promise.resolve([{ acquired: 1 }]);
    if (sql.includes('RELEASE_LOCK')) return Promise.resolve([]);
    return domainQuery(sql, parameters);
  });
  const commitTransaction = vi.fn().mockResolvedValue(undefined);
  const rollbackTransaction = vi.fn().mockResolvedValue(undefined);
  const runner = {
    connect: vi.fn().mockResolvedValue(undefined),
    startTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction,
    rollbackTransaction,
    release: vi.fn().mockResolvedValue(undefined),
    query: runnerQuery,
    isTransactionActive: true,
  } as unknown as QueryRunner;
  const database = {
    query,
    createQueryRunner: () => runner,
  } as unknown as DataSource;
  const passwords = {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  } as unknown as PasswordHashService;
  const service = new UserManagementService(database, passwords);

  beforeEach(() => {
    query.mockReset();
    domainQuery.mockReset();
    vi.clearAllMocks();
  });

  it('does not trust the cookie unless its current database role is admin', async () => {
    query.mockResolvedValueOnce([{ role: 'user', banned: false }]);
    await expect(service.requireAdminUser('admin-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('stores only the invitation token digest and returns the raw token once', async () => {
    domainQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([invitation]);
    const created = await service.createInvitation(
      'admin-1',
      'Invitee@Example.com',
    );
    const tokenHash = createHash('sha256').update(created.token).digest('hex');
    expect(created.token).toHaveLength(43);
    expect(domainQuery.mock.calls[3]?.[1]).toContain(tokenHash);
    expect(JSON.stringify(domainQuery.mock.calls)).not.toContain(created.token);
    expect(commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a competing invitation when the open-email index wins the race', async () => {
    domainQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(
        Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }),
      );

    await expect(
      service.createInvitation('admin-1', 'invitee@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(commitTransaction).not.toHaveBeenCalled();
  });

  it('consumes an invitation and creates its credential account in one transaction', async () => {
    query.mockResolvedValueOnce([invitation]);
    domainQuery
      .mockResolvedValueOnce([invitation])
      .mockResolvedValue(undefined);
    await service.acceptInvitation('one-time-token', 'Invitee', 'password123');
    expect(domainQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(
      domainQuery.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO `user`'),
      ),
    ).toBe(true);
    expect(
      domainQuery.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO `account`'),
      ),
    ).toBe(true);
    expect(commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('revokes outstanding links when an account is created directly', async () => {
    domainQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          name: 'Invitee',
          email: 'invitee@example.com',
          emailVerified: false,
          banned: false,
          role: 'user',
          createdAt: new Date(),
        },
      ]);
    await service.createUser('Invitee', 'INVITEE@example.com', 'password123');
    expect(
      domainQuery.mock.calls.some(
        ([sql, parameters]) =>
          sql.includes('UPDATE `user_invitation`') &&
          parameters?.[0] === 'invitee@example.com',
      ),
    ).toBe(true);
    expect(commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back when a link was revoked before acceptance', async () => {
    query.mockResolvedValueOnce([invitation]);
    domainQuery.mockResolvedValueOnce([
      { ...invitation, revokedAt: new Date() },
    ]);
    await expect(
      service.acceptInvitation('one-time-token', 'Invitee', 'password123'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(commitTransaction).not.toHaveBeenCalled();
  });
});
