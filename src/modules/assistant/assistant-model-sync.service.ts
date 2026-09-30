import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DataSource } from 'typeorm';

import { AssistantConfigurationService } from './assistant-configuration.service.js';
import type { KeyRow } from './configuration-persistence.types.js';

// AI modified: scheduled catalog refresh owns its lifecycle independently from interactive configuration requests.
@Injectable()
export class AssistantModelSyncService {
  private readonly logger = new Logger(AssistantModelSyncService.name);
  constructor(
    private readonly database: DataSource,
    private readonly configuration: AssistantConfigurationService,
  ) {}

  @Cron('0 0 4 * * *')
  async refreshDailyCatalogs(): Promise<void> {
    const keys = await this.database.query<Pick<KeyRow, 'id' | 'userId'>[]>(
      'SELECT `id`, `userId` FROM `assistant_key` WHERE `isEnabled` = 1 AND `isPendingDeletion` = 0',
    );
    for (const key of keys) {
      try {
        await this.configuration.refreshModels(key.userId, key.id);
      } catch {
        this.logger.warn(`Assistant model sync failed for key ${key.id}`);
      }
    }
  }
}
