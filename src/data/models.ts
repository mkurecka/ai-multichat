import { Model } from '../types';

export const availableModels: Model[] = [
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    description: "Anthropic's most powerful model for highly complex tasks",
    selected: false
  },
  {
    id: "anthropic/claude-3-sonnet",
    name: "Claude 3 Sonnet",
    description: "Balanced model for a wide range of tasks",
    selected: false
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    description: "Fast and efficient model for simpler tasks",
    selected: false
  },
  {
    id: "google/gemini-pro",
    name: "Gemini Pro",
    description: "Google's advanced reasoning and instruction model",
    selected: false
  },
  {
    id: "google/gemini-flash",
    name: "Gemini Flash",
    description: "Fast and efficient model from Google",
    selected: false
  },
  {
    id: "meta-llama/llama-3-70b-instruct",
    name: "Llama 3 70B",
    description: "Meta's largest open model with strong reasoning",
    selected: false
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    name: "Llama 3 8B",
    description: "Smaller, efficient Llama 3 model",
    selected: false
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    description: "Mistral's most capable model",
    selected: false
  },
  {
    id: "mistralai/mistral-medium",
    name: "Mistral Medium",
    description: "Balanced performance and efficiency",
    selected: false
  },
  {
    id: "mistralai/mistral-small",
    name: "Mistral Small",
    description: "Fast and efficient model from Mistral",
    selected: false
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's most advanced model",
    selected: false
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Powerful model with strong reasoning capabilities",
    selected: false
  },
  {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and cost-effective model",
    selected: false
  },
  {
    id: "cohere/command-r",
    name: "Command R",
    description: "Cohere's advanced reasoning model",
    selected: false
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    description: "Enhanced version of Command R",
    selected: false
  },
  {
    id: "anthropic/claude-2",
    name: "Claude 2",
    description: "Previous generation Claude model",
    selected: false
  }
];
