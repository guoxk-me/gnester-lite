import type { AssistantProvider, AssistantModelChoice } from './model.types.js';

export interface AssistantKeyView {
  id: string;
  provider: AssistantProvider;
  name: string;
  isEnabled: boolean;
  position: number;
  lastErrorCode: string | null;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface AssistantModelView extends AssistantModelChoice {
  isAvailable: boolean;
  reason:
    | 'unavailable'
    | 'pending_compatibility'
    | 'retired'
    | 'quota_exhausted'
    | 'key_invalid'
    | 'disabled'
    | null;
}

export interface AssistantConfigurationView {
  keys: AssistantKeyView[];
  models: AssistantModelView[];
  defaultModel: AssistantModelChoice | null;
  backupModels: AssistantModelChoice[];
  hasOpenAiConsent: boolean;
  updatedAt: string | null;
  modelNotice: {
    previous: AssistantModelChoice;
    replacement: AssistantModelChoice | null;
  } | null;
}
