export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  modelId: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  /** Закреплён вверху списка в сайдбаре */
  pinned?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'internal';
  available: boolean;
  description?: string;
}

export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  selectedModelId: string;
}
