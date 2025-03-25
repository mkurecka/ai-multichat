// frontend/src/api.ts
import axios, { AxiosInstance } from 'axios';
import { Message } from '../types';

// Define the structure of a model (adjust based on OpenRouter's response)
interface Model {
  id: string;
  name: string;
  description?: string;
}

// Define the structure of a chat history entry (based on your backend)
interface ChatHistoryEntry {
  id: number;
  prompt: string;
  responses: Record<string, string>; // e.g., { "model1": "response1", "model2": "response2" }
  createdAt: string; // ISO date string
}

// Define the structure of the usage data returned by the backend
interface UsageData {
  user: number; // Number of requests by the user
  organization: number; // Number of requests by the organization
}

// Create an Axios instance with the base URL of your Symfony backend
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api', // Your Symfony backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor to include the authentication token in every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Assuming the token is stored in localStorage
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
        // Handle unauthorized access (e.g., redirect to login)
        console.error('Unauthorized - Please log in again');
        // Optionally redirect to login page
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
);

// Fetch available models from OpenRouter via the backend
export const getModels = async (): Promise<Model[]> => {
  try {
    const response = await api.get('/models');
    return response.data; // Adjust based on OpenRouter's response structure
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

    // Transform the backend response into the Message format expected by the frontend
    const responses: Message[] = Object.entries(response.data.responses).map(
        ([modelId, content]) => ({
          role: 'assistant',
          content: content as string,
          modelId,
        })
    );

    return {
      responses,
      usage: response.data.usage, // Usage data for user and organization
    };
  } catch (error) {
    console.error('Error sending message to models:', error);
    throw error;
  }
};

// Fetch chat history for the current user
export const getChatHistory = async (): Promise<ChatHistoryEntry[]> => {
  try {
    const response = await api.get('/history');
    return response.data; // Array of chat history entries
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};