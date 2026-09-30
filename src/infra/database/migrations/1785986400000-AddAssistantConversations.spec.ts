import type { QueryRunner } from 'typeorm';

import { AddAssistantConversations1785986400000 } from './1785986400000-AddAssistantConversations.js';

describe('AddAssistantConversations1785986400000', () => {
  it('creates account-owned history and a unique active generation key', async () => {
    const query = vi
      .fn<(...args: [string]) => Promise<unknown>>()
      .mockResolvedValue(undefined);
    await new AddAssistantConversations1785986400000().up({
      query,
    } as unknown as QueryRunner);
    const statements = query.mock.calls.map(([statement]) => statement);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain(
      'FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE',
    );
    expect(statements[1]).toContain('`contextSnapshot` longtext NOT NULL');
    expect(statements[2]).toContain(
      'UNIQUE INDEX `IDX_assistant_answer_active_user` (`activeUserId`)',
    );
    expect(statements[2]).toContain("`status` IN ('queued', 'generating')");
  });
});
