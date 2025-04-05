// frontend/src/api.ts
import axios, { AxiosInstance } from 'axios';
import { Message, Model, UsageData } from '../types';

// Create an Axios instance with the base URL of your Symfony backend
const api: AxiosInstance = axios.create({
  baseURL: '/api', // Changed to relative path
  headers: {
    'Content-Type': 'application/json',
  },
  // Remove withCredentials as we're using JWT tokens, not cookies
});

// Add an interceptor to include the authentication token in every request
api.interceptors.request.use(async (config) => {
  // Check if token needs refresh before making the request
  // Skip token refresh check for the token refresh endpoint to avoid infinite loops
  if (!config.url?.includes('/token/refresh')) {
    await checkTokenRefresh();
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't retry if the error is from the token refresh endpoint itself
    if (error.config.url?.includes('/token/refresh')) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/callback')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    // For 401 errors, try to refresh the token and retry the request
    if (error.response?.status === 401) {
      console.log('Attempting to refresh token due to 401 error');
      
      try {
        // Try to refresh the token
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Retry the original request
          const originalRequest = error.config;
          return api(originalRequest);
        } else {
          // If refresh failed, redirect to login
          localStorage.removeItem('token');
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/callback')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // If refresh failed, redirect to login
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/callback')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to decode a JWT token
export const decodeToken = (token: string): any => {
  try {
    console.log('Decoding token:', token.substring(0, 20) + '...');
    // Split the token into its parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Invalid token format: not 3 parts');
      return null;
    }
    
    // Get the payload (second part)
    const payload = parts[1];
    console.log('Token payload:', payload);
    
    // Decode the base64 payload
    const jsonPayload = atob(payload);
    console.log('Decoded payload:', jsonPayload);
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Add a function to check if token exists and is valid
export const isAuthenticated = (): boolean => {
  console.log('Checking authentication...');
  const token = localStorage.getItem('token');
  console.log('Token from localStorage:', token ? `exists (${token.substring(0, 20)}...)` : 'not found');
  
  if (!token) {
    console.log('No token found in localStorage');
    return false;
  }
  
  // Decode the token and check if it's expired
  const decodedToken = decodeToken(token);
  console.log('Decoded token:', decodedToken);
  
  if (!decodedToken) {
    console.log('Failed to decode token');
    return false;
  }
  
  // Check if token has exp claim and is not expired
  if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
    // Token is expired
    console.log('Token is expired. Exp:', new Date(decodedToken.exp * 1000).toISOString(), 'Current time:', new Date().toISOString());
    localStorage.removeItem('token');
    return false;
  }
  
  console.log('User is authenticated with valid token');
  return true;
};

// Function to refresh the token
export const refreshToken = async (): Promise<boolean> => {
  try {
    // Get the current token (even if expired) to send with the refresh request
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      return false;
    }
    
    // Create a new axios instance to avoid interceptors that might cause infinite loops
    const refreshApi = axios.create({
      baseURL: '/api', // Changed to relative path
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });
    
    const response = await refreshApi.post('/token/refresh');
    const { token } = response.data;
    
    if (token) {
      localStorage.setItem('token', token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

// Function to check if token needs refresh (e.g., if it expires in less than 1 hour)
export const checkTokenRefresh = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  const decodedToken = decodeToken(token);
  if (!decodedToken || !decodedToken.exp) return;
  
  // If token expires in less than 1 hour (3600 seconds), refresh it
  const expiresIn = decodedToken.exp - (Date.now() / 1000);
  if (expiresIn < 3600) {
    await refreshToken();
  }
};

// Check if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Fetch available models
export const getModels = async (): Promise<Model[]> => {
  if (isDevelopment) {
    console.log('API: Fetching models...');
  }
  try {
    const response = await api.get('/models');
    if (isDevelopment) {
      console.log('API: Raw response:', response);
    }
    
    if (response.data && Array.isArray(response.data)) {
      if (isDevelopment) {
        console.log('API: Models fetched successfully:', response.data);
      }
      return response.data;
    }
    
    console.error('API: Invalid response format:', response.data);
    return [];
  } catch (error) {
    console.error('API: Error fetching models:', error);
    if (axios.isAxiosError(error)) {
      console.error('API: Status:', error.response?.status);
      console.error('API: Response data:', error.response?.data);
    }
    return [];
  }
};

// Refresh models cache
export const refreshModels = async (): Promise<Model[]> => {
  try {
    const response = await api.get('/models/refresh');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error refreshing models:', error);
    throw error;
  }
};

// Send a message to the selected models and get responses
export const sendMessageToModels = async (
  prompt: string,
  modelIds: string[],
  threadId?: string,
  parentId?: string,
  onStream?: (modelId: string, content: string, promptId: string, threadId: string) => void
): Promise<any> => {
  try {
    // Generate a unique promptId for this prompt
    const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // If no threadId provided, create a new thread first
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const { threadId: newThreadId } = await createThread();
      currentThreadId = newThreadId;
    }

    if (onStream) {
      // For streaming, we'll handle all selected models
      const responses = await Promise.allSettled(
        modelIds.map(async (modelId) => {
          try {
            const response = await fetch(`${api.defaults.baseURL}/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              credentials: 'include',
              body: JSON.stringify({
                prompt,
                models: [modelId],
                threadId: currentThreadId,
                parentId,
                promptId,
                stream: true
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Network response was not ok');
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No reader available');
            }

            const decoder = new TextDecoder();
            let content = '';
            let openRouterId = null;
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              buffer += chunk;

              // Process complete lines
              const lines = buffer.split('\n');
              // Keep the last (potentially incomplete) line in the buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    break;
                  }
                  try {
                    // Skip empty or malformed data
                    if (!data.trim()) continue;
                    
                    const parsed = JSON.parse(data);
                    if (parsed.done) {
                      // Update content with the final response
                      if (parsed.content) {
                        content = parsed.content;
                        onStream(modelId, content, promptId, currentThreadId);
                      }
                    }
                    if (parsed.id) {
                      openRouterId = parsed.id;
                    }
                    if (parsed.content) {
                      content += parsed.content;
                      onStream(modelId, content, promptId, currentThreadId);
                    }
                  } catch (e) {
                    console.error('Error parsing streaming response:', e);
                    // Skip malformed data and continue
                    continue;
                  }
                }
              }
            }

            // Process any remaining data in the buffer
            if (buffer.trim()) {
              const line = buffer.trim();
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data !== '[DONE]' && data.trim()) {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.done) {
                      if (parsed.content) {
                        content = parsed.content;
                        onStream(modelId, content, promptId, currentThreadId);
                      }
                    }
                    if (parsed.id) {
                      openRouterId = parsed.id;
                    }
                    if (parsed.content) {
                      content += parsed.content;
                      onStream(modelId, content, promptId, currentThreadId);
                    }
                  } catch (e) {
                    console.error('Error parsing final streaming response:', e);
                  }
                }
              }
            }

            return {
              modelId,
              content,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              id: openRouterId,
              threadId: currentThreadId
            };
          } catch (error: any) {
            return {
              modelId,
              content: `Error: ${error.message}`,
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              id: null,
              threadId: currentThreadId
            };
          }
        })
      );

      // Process all responses, including errors
      const combinedResponses = responses.reduce((acc: { responses: Record<string, { content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; id: string | null }>; threadId: string }, result) => {
        if (result.status === 'fulfilled') {
          const response = result.value;
          acc.responses[response.modelId] = {
            content: response.content,
            usage: response.usage,
            id: response.id
          };
          acc.threadId = currentThreadId;
        }
        return acc;
      }, { responses: {}, threadId: currentThreadId });

      // Ensure we have all responses
      if (Object.keys(combinedResponses.responses).length !== modelIds.length) {
        console.warn('Some model responses were not received:', {
          expected: modelIds.length,
          received: Object.keys(combinedResponses.responses).length,
          models: modelIds,
          responses: Object.keys(combinedResponses.responses)
        });
      }

      return combinedResponses;
    } else {
      // Non-streaming response
      const response = await api.post('/chat', {
        prompt,
        models: modelIds,
        threadId: currentThreadId,
        parentId,
        stream: false
      });
      return response.data;
    }
  } catch (error) {
    console.error('Error sending message:', error);
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

export const getThreadHistory = async (threadId: string): Promise<any> => {
  try {
    const response = await api.get(`/chat/thread/${threadId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching thread history:', error);
    throw error;
  }
};

// Function to handle user logout
export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/app/login';
};

export const createThread = async (): Promise<{ threadId: string }> => {
  try {
    const response = await api.post('/chat/thread');
    return response.data;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

export interface ThreadCost {
  threadId: string;
  title: string;
  messageCount: number;
  lastMessageDate: string;
  totalCost: number;
  totalTokens: number;
}

export const getThreadCosts = async (): Promise<ThreadCost[]> => {
  try {
    const response = await api.get<ThreadCost[]>('/chat/costs');
    return response.data;
  } catch (error) {
    console.error('Error fetching thread costs:', error);
    throw error;
  }
};
