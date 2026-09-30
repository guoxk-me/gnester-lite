export interface AssistantModelMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantGenerationJob {
  answerId: string;
}
