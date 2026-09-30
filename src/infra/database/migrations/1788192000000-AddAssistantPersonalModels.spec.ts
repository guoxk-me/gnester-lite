import type { QueryRunner } from 'typeorm';

import { AddAssistantPersonalModels1788192000000 } from './1788192000000-AddAssistantPersonalModels.js';

describe('AddAssistantPersonalModels1788192000000', () => {
  it('stores credentials by user and retains existing conversation model labels', async () => {
    const query = vi
      .fn<(...args: [string]) => Promise<unknown>>()
      .mockResolvedValue(undefined);
    await new AddAssistantPersonalModels1788192000000().up({
      query,
    } as unknown as QueryRunner);
    const statements = query.mock.calls.map(([statement]) => statement);
    expect(statements[0]).toContain(
      'FOREIGN KEY (`userId`) REFERENCES `user`(`id`)',
    );
    expect(statements[0]).toContain('`encryptedKey` text NOT NULL');
    expect(statements[2]).toContain('`defaultProvider` varchar(16) NULL');
    expect(statements.at(-1)).toContain("c.`provider` = 'deepseek'");
    expect(statements.at(-1)).toContain('a.`model`');
  });
});
