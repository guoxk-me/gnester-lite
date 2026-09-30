import type { AssistantAnswerStatus } from './conversation.types.js';

export interface PreviousTurnRow {
  question: string;
  answer: string | null;
  status: AssistantAnswerRow['status'] | null;
}

export interface VersionRow {
  version: number;
}

export interface AssistantConversationRow {
  id: string;
  userId: string;
  title: string;
  provider: 'deepseek' | 'openai' | null;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssistantTurnRow {
  id: string;
  conversationId: string;
  question: string;
  contextSnapshot: string;
  selectedAnswerId: string | null;
  createdAt: Date;
}

export interface AssistantAnswerRow {
  id: string;
  turnId: string;
  userId: string;
  version: number;
  content: string;
  status: AssistantAnswerStatus;
  model: string;
  provider: 'deepseek' | 'openai' | null;
  keyId: string | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
