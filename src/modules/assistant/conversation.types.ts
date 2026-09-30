export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  activeAnswerId: string | null;
  provider: 'deepseek' | 'openai' | null;
  model: string | null;
}

export interface AnswerView {
  id: string;
  version: number;
  content: string;
  status: AssistantAnswerStatus;
  model: string;
  provider: 'deepseek' | 'openai' | null;
  errorCode: string | null;
  createdAt: string;
}

export interface TurnView {
  id: string;
  question: string;
  selectedAnswerId: string | null;
  createdAt: string;
  answers: AnswerView[];
}

export interface ConversationView extends ConversationSummary {
  turns: TurnView[];
}

export type AssistantAnswerStatus =
  'queued' | 'generating' | 'completed' | 'stopped' | 'failed';
