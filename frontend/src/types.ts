export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string; // Made optional to match OpenRouter's response
  provider?: string; // Made optional
  selected: boolean;
}

export interface ChatSession {
  id: string;
  title: string; // We'll use the prompt as the title
  messages: Message[];
  selectedModels: string[];
}