// This is a mock API service
// In a real application, this would connect to OpenRouter or other model APIs

import { Message } from '../types';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessageToModel = async (
  modelId: string, 
  prompt: string
): Promise<Message> => {
  // Simulate API call delay
  await delay(500 + Math.random() * 2000);
  
  // Mock response based on model ID
  return {
    role: 'assistant',
    content: `This is a response from model ${modelId} to: "${prompt}"`,
    modelId
  };
};

export const sendMessageToModels = async (
  modelIds: string[],
  prompt: string
): Promise<Message[]> => {
  // Send to all selected models in parallel
  const responses = await Promise.all(
    modelIds.map(modelId => sendMessageToModel(modelId, prompt))
  );
  
  return responses;
};
