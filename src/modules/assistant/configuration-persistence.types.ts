import type { AssistantProvider } from './model.types.js';

export interface KeyRow {
  id: string;
  userId: string;
  provider: AssistantProvider;
  name: string;
  encryptedKey: string;
  isEnabled: number;
  isPendingDeletion: number;
  position: number;
  lastErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeyModelRow {
  keyId: string;
  modelId: string;
  isTextCompatible: number;
  missingCount: number;
  lastSeenAt: Date;
}

export interface PreferenceRow {
  userId: string;
  defaultProvider: AssistantProvider | null;
  defaultModel: string | null;
  backupModels: string;
  modelNotice: string | null;
  openaiConsentVersion: string | null;
  updatedAt: Date;
}

// AI modified: keep persistent model controls independent of per-Key catalog rows.
export interface ModelPreferenceRow {
  provider: AssistantProvider;
  modelId: string;
  isEnabled: number;
}

export interface ConfigurationAuditEvent {
  userId: string;
  action:
    | 'key_created'
    | 'key_replaced'
    | 'key_updated'
    | 'key_deleted'
    | 'key_revoked'
    | 'model_updated'
    | 'preferences_updated'
    | 'openai_consent';
  targetId: string;
  outcome: 'success' | 'denied' | 'failed';
  errorCode: string | null;
}
