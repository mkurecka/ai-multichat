// frontend/src/api.ts
import axios, { AxiosInstance } from 'axios';
import { Message, Model, UsageData } from '../types';

// Create an Axios instance with the base URL of your Symfony backend
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor to include the authentication token in every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fetch available models
export const getModels = async (): Promise<Model[]> => {
  try {
    const response = await api.get('/models');
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

// Send a message to the selected models and get responses
export const sendMessageToModels = async (
  modelIds: string[],
  prompt: string
): Promise<{ responses: Message[]; usage: UsageData }> => {
  try {
    const response = await api.post('/chat', {
      prompt,
      models: modelIds,
    });

    const responses: Message[] = Object.entries(response.data.responses).map(
      ([modelId, content]) => ({
        role: 'assistant',
        content: content as string,
        modelId,
      })
    );

    return {
      responses,
      usage: response.data.usage,
    };
  } catch (error) {
    console.error('Error sending message to models:', error);
    throw error;
  }
};

// Fetch chat history
export const getChatHistory = async (): Promise<any[]> => {
  try {
    const response = await api.get('/chat/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};