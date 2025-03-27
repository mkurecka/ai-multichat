export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  id?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  provider?: string;
  selected: boolean;
  pricing?: {
    prompt: number;
    completion: number;
    unit: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModels: string[];
  threadId?: string | null;
  parentId?: string;
}

export interface UsageData {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
