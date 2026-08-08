import type { QueryRunner } from 'typeorm';

import { CreateDemoTable1760000000000 } from './1760000000000-CreateDemoTable';

describe('CreateDemoTable1760000000000', () => {
  it('uses MySQL string literals that remain valid with ANSI_QUOTES enabled', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValue(undefined);
    const migration = new CreateDemoTable1760000000000();

    await migration.up({ query } as unknown as QueryRunner);

    const createTableStatement = query.mock.calls[0]?.[0];
    expect(createTableStatement).toContain(
      "COMMENT 'Demo row id Demo 记录 ID'",
    );
    expect(createTableStatement).toContain("COMMENT 'Demo name Demo 名称'");
    expect(createTableStatement).toContain(
      "COMMENT 'Demo description Demo 描述'",
    );
    expect(createTableStatement).not.toContain('COMMENT "');
  });
});
