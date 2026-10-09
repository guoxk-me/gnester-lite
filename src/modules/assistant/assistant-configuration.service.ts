import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DataSource, type QueryRunner } from 'typeorm';

import {
  AssistantProviderService,
  isTextModel,
} from './assistant-provider.service.js';
import type { AssistantProvider, AssistantModelChoice } from './model.types.js';
import type {
  KeyRow,
  KeyModelRow,
  PreferenceRow,
  ModelPreferenceRow,
  ConfigurationAuditEvent,
} from './configuration-persistence.types.js';
import type { CatalogModel } from './provider-protocol.types.js';
import type {
  AssistantModelView,
  AssistantConfigurationView,
} from './configuration.types.js';
import { SymmetricEncryptionService } from '../../infra/crypto/symmetric-encryption.service.js';
import { AssistantCancellation } from './assistant-generation.service.js';

const OPENAI_CONSENT_VERSION = '2026-09-29';

function isAssistantProvider(provider: string): provider is AssistantProvider {
  return provider === 'deepseek' || provider === 'openai';
}

@Injectable()
export class AssistantConfigurationService {
  private readonly logger = new Logger(AssistantConfigurationService.name);
  constructor(
    private readonly database: DataSource,
    private readonly encryption: SymmetricEncryptionService,
    private readonly providers: AssistantProviderService,
    private readonly cancellation: AssistantCancellation,
  ) {}

  async getConfiguration(userId: string): Promise<AssistantConfigurationView> {
    const [keys, keyModels, preference, modelPreferences] = await Promise.all([
      this.database.query<KeyRow[]>(
        'SELECT * FROM `assistant_key` WHERE `userId` = ? AND `isPendingDeletion` = 0 ORDER BY `provider`, `position`, `createdAt`',
        [userId],
      ),
      this.database.query<
        (KeyModelRow & {
          provider: AssistantProvider;
          isEnabled: number;
          lastErrorCode: string | null;
        })[]
      >(
        'SELECT km.*, k.`provider`, k.`isEnabled`, k.`lastErrorCode` FROM `assistant_key_model` km INNER JOIN `assistant_key` k ON k.`id` = km.`keyId` WHERE k.`userId` = ? AND k.`isPendingDeletion` = 0',
        [userId],
      ),
      this.readPreference(userId),
      this.database.query<ModelPreferenceRow[]>(
        'SELECT `provider`, `modelId`, `isEnabled` FROM `assistant_model_preference` WHERE `userId` = ?',
        [userId],
      ),
    ]);
    const disabledModels = new Set(
      modelPreferences
        .filter((model) => !model.isEnabled)
        .map((model) => `${model.provider}:${model.modelId}`),
    );
    const models = new Map<string, AssistantModelView>();
    const lastSyncedByKey = new Map<string, number>();
    for (const model of keyModels) {
      lastSyncedByKey.set(
        model.keyId,
        Math.max(
          lastSyncedByKey.get(model.keyId) ?? 0,
          new Date(model.lastSeenAt).getTime(),
        ),
      );
      const identity = `${model.provider}:${model.modelId}`;
      const isAvailable =
        !disabledModels.has(identity) &&
        Boolean(model.isEnabled) &&
        !model.lastErrorCode &&
        Boolean(model.isTextCompatible) &&
        model.missingCount < 2;
      const existing = models.get(identity);
      models.set(identity, {
        provider: model.provider,
        modelId: model.modelId,
        isEnabled: !disabledModels.has(identity),
        isAvailable: Boolean(existing?.isAvailable || isAvailable),
        reason: disabledModels.has(identity)
          ? 'disabled'
          : existing?.isAvailable || isAvailable
            ? null
            : !model.isTextCompatible
              ? 'pending_compatibility'
              : model.missingCount >= 2
                ? 'retired'
                : model.lastErrorCode === 'quota_exhausted'
                  ? 'quota_exhausted'
                  : model.lastErrorCode === 'key_invalid'
                    ? 'key_invalid'
                    : !model.isEnabled
                      ? 'disabled'
                      : 'unavailable',
      });
    }
    const backupModels = preference
      ? this.readBackupModels(preference.backupModels)
      : [];
    return {
      keys: keys.map((key) => ({
        id: key.id,
        provider: key.provider,
        name: key.name,
        isEnabled: Boolean(key.isEnabled),
        position: key.position,
        lastErrorCode: key.lastErrorCode,
        updatedAt: new Date(key.updatedAt).toISOString(),
        lastSyncedAt: lastSyncedByKey.has(key.id)
          ? new Date(lastSyncedByKey.get(key.id)!).toISOString()
          : null,
      })),
      models: [...models.values()].sort((a, b) =>
        `${a.provider}:${a.modelId}`.localeCompare(
          `${b.provider}:${b.modelId}`,
        ),
      ),
      defaultModel:
        preference?.defaultProvider && preference.defaultModel
          ? {
              provider: preference.defaultProvider,
              modelId: preference.defaultModel,
            }
          : null,
      backupModels,
      hasOpenAiConsent:
        preference?.openaiConsentVersion === OPENAI_CONSENT_VERSION,
      updatedAt: preference?.updatedAt
        ? new Date(preference.updatedAt).toISOString()
        : null,
      modelNotice: preference?.modelNotice
        ? (JSON.parse(
            preference.modelNotice,
          ) as AssistantConfigurationView['modelNotice'])
        : null,
    };
  }

  async saveKey(
    userId: string,
    provider: AssistantProvider,
    name: string,
    apiKey: string,
    existingKeyId?: string,
  ): Promise<AssistantConfigurationView> {
    const cleanName = name.trim();
    const cleanKey = apiKey.trim();
    if (!cleanName || !cleanKey || cleanKey.length > 512) {
      throw new BadRequestException('Key name and API Key are required');
    }
    const existingKey = existingKeyId
      ? await this.ownedKey(userId, existingKeyId, 'key_replaced')
      : null;
    if (existingKey && existingKey.provider !== provider) {
      throw new BadRequestException('Provider cannot be changed');
    }
    // AI modified: a candidate never replaces a working secret until both official checks pass.
    let catalog: CatalogModel[];
    let validationModel: CatalogModel;
    try {
      catalog = await this.providers.readCatalog(provider, cleanKey);
      const compatibleModels = catalog.filter((model) =>
        isTextModel(provider, model),
      );
      if (!compatibleModels.length) {
        throw new BadRequestException(
          'No compatible text model is available for this Key',
        );
      }
      const preferredIds =
        provider === 'deepseek'
          ? ['deepseek-flash', 'deepseek-chat', 'deepseek-reasoner']
          : ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini'];
      validationModel =
        preferredIds
          .map((id) => compatibleModels.find((model) => model.id === id))
          .find((model) => model !== undefined) ?? compatibleModels[0]!;
      try {
        await this.providers.verifyTextGeneration(
          provider,
          validationModel.id,
          cleanKey,
        );
      } catch {
        throw new BadRequestException('API Key validation failed');
      }
    } catch (error) {
      await this.recordFailedChange(
        userId,
        existingKeyId ? 'key_replaced' : 'key_created',
        `${provider}:${existingKeyId ?? 'new'}`,
        error,
      );
      throw error;
    }

    const keyId = existingKeyId ?? randomUUID();
    const encryptedKey = this.encryption.encryptString(
      cleanKey,
      `${userId}:${provider}:${keyId}`,
    );
    await this.changeConfiguration(
      userId,
      existingKeyId ? 'key_replaced' : 'key_created',
      `${provider}:${keyId}`,
      async (runner) => {
        if (existingKey) {
          await runner.query(
            'UPDATE `assistant_key` SET `name` = ?, `encryptedKey` = ?, `isEnabled` = 1, `lastErrorCode` = NULL WHERE `id` = ? AND `userId` = ?',
            [cleanName, encryptedKey, keyId, userId],
          );
        } else {
          const positions = (await runner.query(
            'SELECT COALESCE(MAX(`position`), -1) AS `position` FROM `assistant_key` WHERE `userId` = ? AND `provider` = ?',
            [userId, provider],
          )) as { position: number }[];
          await runner.query(
            'INSERT INTO `assistant_key` (`id`, `userId`, `provider`, `name`, `encryptedKey`, `position`) VALUES (?, ?, ?, ?, ?, ?)',
            [
              keyId,
              userId,
              provider,
              cleanName,
              encryptedKey,
              Number(positions[0]?.position ?? -1) + 1,
            ],
          );
        }
        await this.writeCatalog(runner, keyId, provider, catalog);
        await runner.query(
          'INSERT IGNORE INTO `assistant_preferences` (`userId`, `backupModels`) VALUES (?, ?)',
          [userId, '[]'],
        );
        await runner.query(
          'UPDATE `assistant_preferences` SET `defaultProvider` = ?, `defaultModel` = ? WHERE `userId` = ? AND `defaultModel` IS NULL',
          [provider, validationModel.id, userId],
        );
        // AI modified: default repair belongs to the same durable change as the Key and its audit event.
        await this.repairDefault(userId, runner);
      },
    );
    return this.getConfiguration(userId);
  }

  async updateKey(
    userId: string,
    keyId: string,
    changes: { name?: string; isEnabled?: boolean; position?: number },
  ): Promise<AssistantConfigurationView> {
    const owned = await this.ownedKey(userId, keyId, 'key_updated');
    if (changes.name !== undefined && !changes.name.trim()) {
      throw new BadRequestException('Key name is required');
    }
    await this.changeConfiguration(
      userId,
      'key_updated',
      `${owned.provider}:${keyId}`,
      async (runner) => {
        await runner.query(
          'UPDATE `assistant_key` SET `name` = COALESCE(?, `name`), `isEnabled` = COALESCE(?, `isEnabled`) WHERE `id` = ? AND `userId` = ?',
          [
            changes.name?.trim() ?? null,
            changes.isEnabled === undefined ? null : Number(changes.isEnabled),
            keyId,
            userId,
          ],
        );
        if (changes.position !== undefined) {
          const siblings = (await runner.query(
            'SELECT `id` FROM `assistant_key` WHERE `userId` = ? AND `provider` = ? AND `isPendingDeletion` = 0 ORDER BY `position`, `createdAt` FOR UPDATE',
            [userId, owned.provider],
          )) as { id: string }[];
          const orderedIds = siblings
            .map((sibling) => sibling.id)
            .filter((id) => id !== keyId);
          orderedIds.splice(
            Math.min(changes.position, orderedIds.length),
            0,
            keyId,
          );
          for (const [position, id] of orderedIds.entries())
            await runner.query(
              'UPDATE `assistant_key` SET `position` = ? WHERE `id` = ?',
              [position, id],
            );
        }
        await this.repairDefault(userId, runner);
      },
    );
    return this.getConfiguration(userId);
  }

  async deleteKey(
    userId: string,
    keyId: string,
  ): Promise<AssistantConfigurationView> {
    const key = await this.ownedKey(userId, keyId, 'key_deleted');
    // AI modified: in-flight answers may finish, but queued and new work cannot reuse a removed Key.
    await this.changeConfiguration(
      userId,
      'key_deleted',
      `${key.provider}:${keyId}`,
      async (runner) => {
        await runner.query(
          'UPDATE `assistant_key` SET `isEnabled` = 0, `isPendingDeletion` = 1 WHERE `id` = ? AND `userId` = ?',
          [keyId, userId],
        );
        await this.repairDefault(userId, runner);
      },
    );
    await this.finishKeyDeletion(keyId);
    return this.getConfiguration(userId);
  }

  async finishKeyDeletion(keyId: string): Promise<void> {
    const active = await this.database.query<{ id: string }[]>(
      'SELECT `id` FROM `assistant_answer` WHERE `keyId` = ? AND `status` = ? LIMIT 1',
      [keyId, 'generating'],
    );
    if (!active.length) {
      await this.database.query(
        'DELETE FROM `assistant_key` WHERE `id` = ? AND `isPendingDeletion` = 1',
        [keyId],
      );
    }
  }

  async savePreferences(
    userId: string,
    defaultModel: AssistantModelChoice | null,
    backupModels: AssistantModelChoice[],
  ): Promise<AssistantConfigurationView> {
    await this.changeConfiguration(
      userId,
      'preferences_updated',
      userId,
      async (runner) => {
        await this.requireValidPreferences(
          userId,
          defaultModel,
          backupModels,
          runner,
        );
        await this.writePreferences(runner, userId, defaultModel, backupModels);
      },
    );
    return this.getConfiguration(userId);
  }

  private async requireValidPreferences(
    userId: string,
    defaultModel: AssistantModelChoice | null,
    backupModels: AssistantModelChoice[],
    executor: DataSource | QueryRunner,
  ): Promise<void> {
    if (backupModels.length > 12)
      throw new BadRequestException('Too many backup models');
    if (
      defaultModel &&
      !(await this.isModelAvailable(userId, defaultModel, executor))
    ) {
      throw new BadRequestException('Default model is unavailable');
    }
    const identities = new Set<string>();
    for (const model of backupModels) {
      const identity = `${model.provider}:${model.modelId}`;
      if (
        identities.has(identity) ||
        (defaultModel &&
          identity === `${defaultModel.provider}:${defaultModel.modelId}`)
      ) {
        throw new BadRequestException('Backup models must be distinct');
      }
      identities.add(identity);
      if (!(await this.isModelAvailable(userId, model, executor))) {
        throw new BadRequestException('Backup model is unavailable');
      }
    }
    if (
      !defaultModel &&
      (await this.getAvailableModels(userId, executor)).length
    ) {
      throw new BadRequestException('A default model is required');
    }
  }

  private async writePreferences(
    executor: DataSource | QueryRunner,
    userId: string,
    defaultModel: AssistantModelChoice | null,
    backupModels: AssistantModelChoice[],
  ): Promise<void> {
    await executor.query(
      'INSERT INTO `assistant_preferences` (`userId`, `defaultProvider`, `defaultModel`, `backupModels`, `modelNotice`) VALUES (?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE `defaultProvider` = VALUES(`defaultProvider`), `defaultModel` = VALUES(`defaultModel`), `backupModels` = VALUES(`backupModels`), `modelNotice` = NULL',
      [
        userId,
        defaultModel?.provider ?? null,
        defaultModel?.modelId ?? null,
        JSON.stringify(backupModels),
      ],
    );
  }

  async consentToOpenAi(userId: string): Promise<void> {
    await this.changeConfiguration(
      userId,
      'openai_consent',
      userId,
      async (runner) => {
        await runner.query(
          'INSERT INTO `assistant_preferences` (`userId`, `backupModels`, `openaiConsentVersion`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `openaiConsentVersion` = VALUES(`openaiConsentVersion`)',
          [userId, '[]', OPENAI_CONSENT_VERSION],
        );
      },
    );
  }

  // AI modified: stopping a model and replacing its defaults is one durable account-owned operation.
  async updateModel(
    userId: string,
    changes: AssistantModelChoice & {
      isEnabled: boolean;
      defaultModel?: AssistantModelChoice | null;
      backupModels: AssistantModelChoice[];
    },
  ): Promise<AssistantConfigurationView> {
    await this.changeConfiguration(
      userId,
      'model_updated',
      `${changes.provider}:${changes.modelId}`,
      async (runner) => {
        const catalog = (await runner.query(
          'SELECT km.`modelId` FROM `assistant_key_model` km INNER JOIN `assistant_key` k ON k.`id` = km.`keyId` WHERE k.`userId` = ? AND k.`provider` = ? AND km.`modelId` = ? AND k.`isPendingDeletion` = 0 LIMIT 1',
          [userId, changes.provider, changes.modelId],
        )) as unknown as { modelId: string }[];
        if (!catalog.length) throw new NotFoundException();
        await runner.query(
          'INSERT INTO `assistant_model_preference` (`userId`, `provider`, `modelId`, `isEnabled`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `isEnabled` = VALUES(`isEnabled`), `updatedAt` = CURRENT_TIMESTAMP(3)',
          [
            userId,
            changes.provider,
            changes.modelId,
            Number(changes.isEnabled),
          ],
        );
        const defaultModel = changes.defaultModel ?? null;
        await this.requireValidPreferences(
          userId,
          defaultModel,
          changes.backupModels,
          runner,
        );
        await this.writePreferences(
          runner,
          userId,
          defaultModel,
          changes.backupModels,
        );
        if (!changes.isEnabled)
          await runner.query(
            'UPDATE `assistant_answer` SET `status` = ?, `errorCode` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `userId` = ? AND `provider` = ? AND `model` = ? AND `status` = ?',
            [
              'stopped',
              'model_disabled',
              userId,
              changes.provider,
              changes.modelId,
              'queued',
            ],
          );
      },
    );
    return this.getConfiguration(userId);
  }

  // AI modified: revocation shares the account lock with publication and worker admission, so a removed Key cannot fall back and resend.
  async revokeKey(
    userId: string,
    keyId: string,
  ): Promise<AssistantConfigurationView> {
    const owned = await this.ownedKey(userId, keyId, 'key_revoked');
    const stoppedAnswers = await this.changeConfiguration(
      userId,
      'key_revoked',
      `${owned.provider}:${keyId}`,
      async (runner) => {
        const keys = (await runner.query(
          'SELECT * FROM `assistant_key` WHERE `id` = ? AND `userId` = ? FOR UPDATE',
          [keyId, userId],
        )) as unknown as KeyRow[];
        if (!keys[0]) throw new NotFoundException();
        const answers = (await runner.query(
          'SELECT `id` FROM `assistant_answer` WHERE `userId` = ? AND `keyId` = ? AND `status` IN (?, ?) FOR UPDATE',
          [userId, keyId, 'queued', 'generating'],
        )) as unknown as { id: string }[];
        await runner.query(
          'UPDATE `assistant_answer` SET `status` = ?, `errorCode` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `userId` = ? AND `keyId` = ? AND `status` IN (?, ?)',
          ['stopped', 'key_revoked', userId, keyId, 'queued', 'generating'],
        );
        await runner.query(
          'DELETE FROM `assistant_key` WHERE `id` = ? AND `userId` = ?',
          [keyId, userId],
        );
        await this.repairDefault(userId, runner);
        return answers;
      },
    );
    for (const answer of stoppedAnswers) this.cancellation.cancel(answer.id);
    return this.getConfiguration(userId);
  }

  async requireOpenAiConsent(
    userId: string,
    provider: AssistantProvider,
  ): Promise<void> {
    if (provider !== 'openai') return;
    const preference = await this.readPreference(userId);
    if (preference?.openaiConsentVersion !== OPENAI_CONSENT_VERSION) {
      throw new ConflictException('openai_consent_required');
    }
  }

  async chooseModel(
    userId: string,
    requested?: AssistantModelChoice,
    previous?: AssistantModelChoice,
  ): Promise<{ model: AssistantModelChoice; keyId: string }> {
    const preference = await this.readPreference(userId);
    const model =
      requested ??
      previous ??
      (preference?.defaultProvider && preference.defaultModel
        ? {
            provider: preference.defaultProvider,
            modelId: preference.defaultModel,
          }
        : null);
    if (!model) throw new ServiceUnavailableException('personal_key_required');
    await this.requireOpenAiConsent(userId, model.provider);
    const key = await this.availableKey(userId, model);
    if (!key) throw new ServiceUnavailableException('model_unavailable');
    return { model, keyId: key.id };
  }

  async isModelAvailable(
    userId: string,
    model: AssistantModelChoice,
    executor: DataSource | QueryRunner = this.database,
  ): Promise<boolean> {
    return (await this.availableKey(userId, model, executor)) !== null;
  }

  async generationKey(
    userId: string,
    model: AssistantModelChoice,
    preferredKeyId: string | null,
  ): Promise<{ id: string; apiKey: string } | null> {
    const keys = await this.availableKeys(userId, model, this.database, true);
    const key =
      keys.find(
        (candidate) =>
          candidate.id === preferredKeyId && !candidate.lastErrorCode,
      ) ?? keys.find((candidate) => !candidate.lastErrorCode);
    if (!key) return null;
    return {
      id: key.id,
      apiKey: this.encryption.decryptString(
        key.encryptedKey,
        `${userId}:${key.provider}:${key.id}`,
      ),
    };
  }

  async nextGenerationKey(
    userId: string,
    model: AssistantModelChoice,
    currentKeyId: string,
  ): Promise<{ id: string; apiKey: string } | null> {
    const keys = await this.availableKeys(userId, model, this.database, true);
    const index = keys.findIndex((key) => key.id === currentKeyId);
    const key = keys
      .slice(index + 1)
      .find((candidate) => !candidate.lastErrorCode);
    if (!key) return null;
    return {
      id: key.id,
      apiKey: this.encryption.decryptString(
        key.encryptedKey,
        `${userId}:${key.provider}:${key.id}`,
      ),
    };
  }

  async markKeyFailure(
    keyId: string,
    code: 'key_invalid' | 'quota_exhausted',
  ): Promise<void> {
    await this.database.query(
      'UPDATE `assistant_key` SET `lastErrorCode` = ? WHERE `id` = ?',
      [code, keyId],
    );
    const keys = await this.database.query<Pick<KeyRow, 'userId'>[]>(
      'SELECT `userId` FROM `assistant_key` WHERE `id` = ? LIMIT 1',
      [keyId],
    );
    if (keys[0]) await this.repairDefault(keys[0].userId);
  }

  async refreshModels(
    userId: string,
    keyId: string,
  ): Promise<AssistantConfigurationView> {
    const key = await this.ownedKey(userId, keyId);
    const secret = this.encryption.decryptString(
      key.encryptedKey,
      `${userId}:${key.provider}:${key.id}`,
    );
    const catalog = await this.providers.readCatalog(key.provider, secret);
    let hasRecoveredQuota = false;
    if (key.lastErrorCode === 'quota_exhausted') {
      const textModel = catalog.find((model) =>
        isTextModel(key.provider, model),
      );
      if (textModel) {
        try {
          // AI modified: a previously exhausted Key becomes selectable only after a real text call succeeds.
          await this.providers.verifyTextGeneration(
            key.provider,
            textModel.id,
            secret,
          );
          hasRecoveredQuota = true;
        } catch {
          /* Keep the Key unavailable until a later sync or replacement. */
        }
      }
    }
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await this.writeCatalog(runner, keyId, key.provider, catalog);
      if (hasRecoveredQuota)
        await runner.query(
          'UPDATE `assistant_key` SET `lastErrorCode` = NULL WHERE `id` = ? AND `userId` = ? AND `lastErrorCode` = ?',
          [keyId, userId, 'quota_exhausted'],
        );
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    await this.repairDefault(userId);
    return this.getConfiguration(userId);
  }

  async retireModel(
    userId: string,
    model: AssistantModelChoice,
  ): Promise<void> {
    await this.database.query(
      'UPDATE `assistant_key_model` km INNER JOIN `assistant_key` k ON k.`id` = km.`keyId` SET km.`missingCount` = 2 WHERE k.`userId` = ? AND k.`provider` = ? AND km.`modelId` = ?',
      [userId, model.provider, model.modelId],
    );
    await this.repairDefault(userId);
  }

  private async writeCatalog(
    runner: ReturnType<DataSource['createQueryRunner']>,
    keyId: string,
    provider: AssistantProvider,
    catalog: CatalogModel[],
  ): Promise<void> {
    const seen = new Set<string>();
    for (const model of catalog) {
      seen.add(model.id);
      await runner.query(
        'INSERT INTO `assistant_key_model` (`keyId`, `modelId`, `isTextCompatible`, `missingCount`) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE `isTextCompatible` = VALUES(`isTextCompatible`), `missingCount` = 0, `lastSeenAt` = CURRENT_TIMESTAMP(3)',
        [keyId, model.id, Number(isTextModel(provider, model))],
      );
    }
    const previous = (await runner.query(
      'SELECT `modelId` FROM `assistant_key_model` WHERE `keyId` = ?',
      [keyId],
    )) as Pick<KeyModelRow, 'modelId'>[];
    for (const model of previous) {
      if (!seen.has(model.modelId)) {
        await runner.query(
          'UPDATE `assistant_key_model` SET `missingCount` = `missingCount` + 1 WHERE `keyId` = ? AND `modelId` = ?',
          [keyId, model.modelId],
        );
      }
    }
  }

  private async getAvailableModels(
    userId: string,
    executor: DataSource | QueryRunner = this.database,
  ): Promise<AssistantModelChoice[]> {
    const rows = await executor.query<
      { provider: AssistantProvider; modelId: string }[]
    >(
      'SELECT DISTINCT k.`provider`, km.`modelId` FROM `assistant_key_model` km INNER JOIN `assistant_key` k ON k.`id` = km.`keyId` LEFT JOIN `assistant_model_preference` p ON p.`userId` = k.`userId` AND p.`provider` = k.`provider` AND p.`modelId` = km.`modelId` WHERE k.`userId` = ? AND COALESCE(p.`isEnabled`, 1) = 1 AND k.`isEnabled` = 1 AND k.`isPendingDeletion` = 0 AND k.`lastErrorCode` IS NULL AND km.`isTextCompatible` = 1 AND km.`missingCount` < 2',
      [userId],
    );
    return rows;
  }

  private async availableKeys(
    userId: string,
    model: AssistantModelChoice,
    executor: DataSource | QueryRunner = this.database,
    isAlreadyGenerating = false,
  ): Promise<KeyRow[]> {
    return executor.query<KeyRow[]>(
      `SELECT k.* FROM \`assistant_key\` k INNER JOIN \`assistant_key_model\` km ON km.\`keyId\` = k.\`id\` LEFT JOIN \`assistant_model_preference\` p ON p.\`userId\` = k.\`userId\` AND p.\`provider\` = k.\`provider\` AND p.\`modelId\` = km.\`modelId\` WHERE k.\`userId\` = ? AND k.\`provider\` = ? AND k.\`isEnabled\` = 1 AND k.\`isPendingDeletion\` = 0 AND km.\`modelId\` = ? AND km.\`isTextCompatible\` = 1 AND km.\`missingCount\` < 2 ${isAlreadyGenerating ? '' : 'AND COALESCE(p.`isEnabled`, 1) = 1'} ORDER BY k.\`position\`, k.\`createdAt\``,
      [userId, model.provider, model.modelId],
    );
  }

  private async availableKey(
    userId: string,
    model: AssistantModelChoice,
    executor: DataSource | QueryRunner = this.database,
  ): Promise<KeyRow | null> {
    return (
      (await this.availableKeys(userId, model, executor)).find(
        (key) => !key.lastErrorCode,
      ) ?? null
    );
  }

  private async ownedKey(
    userId: string,
    keyId: string,
    action?: ConfigurationAuditEvent['action'],
  ): Promise<KeyRow> {
    const keys = await this.database.query<KeyRow[]>(
      'SELECT * FROM `assistant_key` WHERE `id` = ? AND `userId` = ? AND `isPendingDeletion` = 0 LIMIT 1',
      [keyId, userId],
    );
    if (!keys[0]) {
      const error = new NotFoundException();
      // AI modified: rejected reads must not be mislabeled as configuration writes.
      if (action) await this.recordFailedChange(userId, action, keyId, error);
      throw error;
    }
    return keys[0];
  }

  private async readPreference(
    userId: string,
    executor: DataSource | QueryRunner = this.database,
  ): Promise<PreferenceRow | null> {
    const rows = await executor.query<PreferenceRow[]>(
      'SELECT * FROM `assistant_preferences` WHERE `userId` = ? LIMIT 1',
      [userId],
    );
    return rows[0] ?? null;
  }

  private readBackupModels(serialized: string): AssistantModelChoice[] {
    try {
      const choices = JSON.parse(serialized) as AssistantModelChoice[];
      return Array.isArray(choices)
        ? choices.filter(
            (choice): choice is AssistantModelChoice =>
              Boolean(choice) &&
              typeof choice === 'object' &&
              isAssistantProvider(choice.provider) &&
              typeof choice.modelId === 'string',
          )
        : [];
    } catch {
      return [];
    }
  }

  private async repairDefault(
    userId: string,
    executor: DataSource | QueryRunner = this.database,
  ): Promise<void> {
    const preference = await this.readPreference(userId, executor);
    if (!preference?.defaultProvider || !preference.defaultModel) return;
    if (
      await this.isModelAvailable(
        userId,
        {
          provider: preference.defaultProvider,
          modelId: preference.defaultModel,
        },
        executor,
      )
    )
      return;
    const backup = this.readBackupModels(preference.backupModels);
    let replacement: AssistantModelChoice | null = null;
    for (const model of backup) {
      if (await this.isModelAvailable(userId, model, executor)) {
        replacement = model;
        break;
      }
    }
    await executor.query(
      'UPDATE `assistant_preferences` SET `defaultProvider` = ?, `defaultModel` = ?, `backupModels` = ?, `modelNotice` = ? WHERE `userId` = ?',
      [
        replacement?.provider ?? null,
        replacement?.modelId ?? null,
        JSON.stringify(
          backup.filter(
            (model) =>
              !replacement ||
              `${model.provider}:${model.modelId}` !==
                `${replacement.provider}:${replacement.modelId}`,
          ),
        ),
        JSON.stringify({
          previous: {
            provider: preference.defaultProvider,
            modelId: preference.defaultModel,
          },
          replacement,
        }),
        userId,
      ],
    );
  }
  // AI modified: all configuration writes serialize with answer admission and persist their safe success event atomically.
  private async changeConfiguration<T>(
    userId: string,
    action: ConfigurationAuditEvent['action'],
    targetId: string,
    operation: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query('SELECT `id` FROM `user` WHERE `id` = ? FOR UPDATE', [
        userId,
      ]);
      const response = await operation(runner);
      await this.recordAudit(runner, {
        userId,
        action,
        targetId,
        outcome: 'success',
        errorCode: null,
      });
      await runner.commitTransaction();
      return response;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await this.recordFailedChange(userId, action, targetId, error);
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async recordAudit(
    executor: DataSource | QueryRunner,
    event: ConfigurationAuditEvent,
  ): Promise<void> {
    const separator = event.targetId.indexOf(':');
    const provider = event.targetId.slice(0, separator);
    const modelId =
      event.action === 'model_updated'
        ? event.targetId.slice(separator + 1)
        : null;
    await executor.query(
      'INSERT INTO `assistant_configuration_audit` (`id`, `userId`, `action`, `targetId`, `provider`, `modelId`, `outcome`, `errorCode`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
        event.userId,
        event.action,
        event.targetId,
        isAssistantProvider(provider) ? provider : null,
        modelId,
        event.outcome,
        event.errorCode,
      ],
    );
  }

  private async recordFailedChange(
    userId: string,
    action: ConfigurationAuditEvent['action'],
    targetId: string,
    error: unknown,
  ): Promise<void> {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    try {
      await this.recordAudit(this.database, {
        userId,
        action,
        targetId,
        outcome: [403, 404].includes(status) ? 'denied' : 'failed',
        errorCode: `HTTP_${status}`,
      });
    } catch {
      // AI modified: audit failures cannot expose credential-bearing SQL errors or turn a rolled-back change into success.
      this.logger.error(
        'Failed to persist an assistant configuration failure event',
      );
    }
  }

  async requireSelectedKey(
    runner: QueryRunner,
    userId: string,
    model: AssistantModelChoice,
    keyId: string,
  ): Promise<void> {
    const keys = await this.availableKeys(userId, model, runner);
    if (!keys.some((key) => key.id === keyId && !key.lastErrorCode))
      throw new ConflictException('model_unavailable');
  }
  // AI modified: decrypt only account-owned credentials before invoking the provider protocol.
  async keyBalance(
    userId: string,
    keyId: string,
  ): ReturnType<AssistantProviderService['readBalance']> {
    const key = await this.ownedKey(userId, keyId);
    const secret =
      key.provider === 'openai'
        ? ''
        : this.encryption.decryptString(
            key.encryptedKey,
            `${userId}:${key.provider}:${key.id}`,
          );
    return this.providers.readBalance(key.provider, secret);
  }
}
