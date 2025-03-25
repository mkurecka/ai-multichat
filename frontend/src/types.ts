export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  provider: string;
  selected: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModels: string[];
}
