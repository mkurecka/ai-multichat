export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  id?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  provider?: string;
  selected: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModels: string[];
  threadId?: string;
  parentId?: string;
}

export interface UsageData {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
