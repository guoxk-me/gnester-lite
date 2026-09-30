export type AssistantProvider = 'deepseek' | 'openai';

export interface AssistantModelChoice {
  provider: AssistantProvider;
  modelId: string;
}
