import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { AssistantConfigurationService } from './assistant-configuration.service.js';
import { AssistantModelSyncService } from './assistant-model-sync.service.js';

// AI modified: scheduled synchronization keeps failure isolation after moving out of interactive configuration.
describe('assistant scheduled catalog synchronization', () => {
  afterEach(() => vi.restoreAllMocks());
  it('continues other owners after one key fails and logs no secret', async () => {
    const refreshModels = vi
      .fn()
      .mockRejectedValueOnce(new Error('provider secret sentinel'))
      .mockResolvedValueOnce({});
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const service = new AssistantModelSyncService(
      {
        query: vi.fn().mockResolvedValue([
          { id: 'first-key', userId: 'first-owner' },
          { id: 'second-key', userId: 'second-owner' },
        ]),
      } as unknown as DataSource,
      { refreshModels } as unknown as AssistantConfigurationService,
    );
    await service.refreshDailyCatalogs();
    expect(refreshModels.mock.calls).toEqual([
      ['first-owner', 'first-key'],
      ['second-owner', 'second-key'],
    ]);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Assistant model sync failed for key first-key',
    );
  });
});
