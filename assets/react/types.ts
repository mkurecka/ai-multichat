export interface Message {
  role: 'user' | 'assistant';
  content: string | { content: string } | any;
  modelId?: string;
  id?: string;
  threadId?: string | null;
  promptId?: string;
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
  selected?: boolean;
  supportsStreaming?: boolean;
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
