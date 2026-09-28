import type { QueryRunner } from 'typeorm';

import { CreateBetterAuthTables1785801600000 } from './1785801600000-CreateBetterAuthTables';

describe('CreateBetterAuthTables1785801600000', () => {
  it('creates the Better Auth core schema with indexed ownership relations', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValue(undefined);
    const migration = new CreateBetterAuthTables1785801600000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls.map(([statement]) => statement)).toEqual([
      expect.stringContaining('CREATE TABLE `user`'),
      expect.stringContaining('CREATE TABLE `session`'),
      expect.stringContaining('CREATE TABLE `account`'),
      expect.stringContaining('CREATE TABLE `verification`'),
    ]);
    expect(query.mock.calls[1]?.[0]).toContain('`session_userId_idx`');
    expect(query.mock.calls[1]?.[0]).toContain(
      'REFERENCES `user`(`id`) ON DELETE CASCADE',
    );
    expect(query.mock.calls[2]?.[0]).toContain('`account_userId_idx`');
    expect(query.mock.calls[3]?.[0]).toContain('`verification_identifier_idx`');
  });

  it('drops dependent tables before the user table', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValue(undefined);
    const migration = new CreateBetterAuthTables1785801600000();

    await migration.down({ query } as unknown as QueryRunner);

    expect(query.mock.calls.map(([statement]) => statement)).toEqual([
      'DROP TABLE `account`',
      'DROP TABLE `session`',
      'DROP TABLE `verification`',
      'DROP TABLE `user`',
    ]);
  });
});
