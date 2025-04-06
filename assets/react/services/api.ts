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
          console.log('Interceptor: Refresh successful, retrying original request.');
          // Update the header for the retried request before retrying
          error.config.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
          console.log('Interceptor: Refresh successful, retrying original request.');
          // Update the header for the retried request before retrying
          error.config.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
          // Ensure the Authorization header is actually set if the token exists
          const token = localStorage.getItem('token');
          if (token) {
              error.config.headers['Authorization'] = `Bearer ${token}`;
          } else {
              // If token somehow disappeared, don't retry with missing auth
              console.warn('Interceptor: Token missing after successful refresh attempt? Aborting retry.');
              return Promise.reject(error);
          }
          return api(error.config); // Retry with potentially new token
        } else {
          console.log('Interceptor: Refresh failed or did not return a new token. Rejecting original request.');
          // refreshToken() handles token removal on 401 failure.
          // Do not remove token or redirect here.
          return Promise.reject(error); // Reject the original promise
        }
      } catch (refreshError) {
         console.error('Interceptor: Error during refresh attempt.', refreshError);
         // Do not remove token or redirect here.
         // Reject with the original error that caused the 401.
         return Promise.reject(error);
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
  
  // Check if token has exp claim
  if (decodedToken.exp) {
      const isExpired = decodedToken.exp < Date.now() / 1000;
      if (isExpired) {
          // Token is expired
          console.log('Token is expired (checked by isAuthenticated). Exp:', new Date(decodedToken.exp * 1000).toISOString(), 'Current time:', new Date().toISOString());
          // DO NOT remove the token here. Let the refresh logic handle it.
          // localStorage.removeItem('token');
          return false; // Indicate not currently authenticated because token is expired
      }
  }
  // If no 'exp' claim or not expired
  console.log('User is authenticated with valid (non-expired) token');
  return true;
};

// Function to refresh the token
export const refreshToken = async (): Promise<boolean> => {
  console.log('Attempting token refresh...');
  const currentToken = localStorage.getItem('token');
  if (!currentToken) {
    console.log('Refresh failed: No current token found.');
    return false; // No token to refresh
  }

  try {
    // Create a new axios instance to avoid interceptors
    const refreshApi = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });

    console.log('Calling POST /api/token/refresh');
    const response = await refreshApi.post('/token/refresh'); // Ensure endpoint is correct
    console.log('Refresh API response status:', response.status);
    console.log('Refresh API response data:', response.data);

    const { token } = response.data;

    if (token) {
      console.log('New token received, updating localStorage.');
      localStorage.setItem('token', token);
      return true;
    } else {
      console.warn('Refresh successful but no token in response data.');
      // Decide if token should be removed here. For now, let's NOT remove it.
      // localStorage.removeItem('token');
      return false; // Indicate refresh didn't provide a new token
    }

  } catch (error) {
    console.error('Error during token refresh API call:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Only remove token if refresh endpoint explicitly says unauthorized
      console.log('Refresh failed with 401, removing token.');
      localStorage.removeItem('token');
    } else {
      // For other errors (network, 500, etc.), don't remove the token,
      // maybe the original token is still valid or the issue is temporary.
      console.log('Refresh failed with non-401 error, token not removed.');
    }
    return false; // Indicate refresh failed
  }
};

// Function to check if token needs refresh (e.g., if it expires in less than 1 hour)
export const checkTokenRefresh = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const decodedToken = decodeToken(token);
  if (!decodedToken || !decodedToken.exp) {
    console.log('Cannot check refresh: Invalid or non-expiring token.');
    return;
  }

  const expiresIn = decodedToken.exp - (Date.now() / 1000);
  console.log(`Token expires in approximately ${Math.round(expiresIn)} seconds.`);

  // If token expires in less than 1 hour (3600 seconds), attempt refresh
  if (expiresIn < 3600) {
    console.log('Token nearing expiry, attempting proactive refresh.');
    const refreshed = await refreshToken();
    if (refreshed) {
      console.log('Proactive token refresh successful.');
    } else {
      console.log('Proactive token refresh failed.');
      // If refresh failed here, refreshToken() might have removed the token if it was a 401.
      // The main auth check in App.tsx will handle the consequences.
    }
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
  if (isDevelopment) {
    console.log('API: Sending message to models:', {
      prompt,
      modelIds,
      threadId,
      parentId,
      hasStreamCallback: !!onStream
    });
  }

  // Generate a unique promptId if not provided
  const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Check if any of the selected models support streaming
  const models = JSON.parse(localStorage.getItem('models') || '[]');
  const selectedModels = models.filter((m: Model) => modelIds.includes(m.id));
  const supportsStreaming = selectedModels.some((m: Model) => m.supportsStreaming);
  
  // If we have a stream callback and at least one model supports streaming, use streaming
  const useStreaming = !!onStream && supportsStreaming && modelIds.length === 1;

  if (isDevelopment) {
    console.log('API: Using streaming:', useStreaming);
    console.log('API: Selected models:', selectedModels);
    console.log('API: Supports streaming:', supportsStreaming);
  }

  try {
    const response = await api.post('/chat', {
      prompt,
      models: modelIds,
      threadId,
      parentId,
      promptId,
      stream: useStreaming
    });

    if (isDevelopment) {
      console.log('API: Response received:', response);
    }

    // If we're using streaming, the response will be handled by the onStream callback
    if (useStreaming) {
      return {
        promptId,
        threadId: threadId || response.data.threadId,
        streaming: true
      };
    }

    // For non-streaming responses, return the full response
    return {
      ...response.data,
      promptId,
      threadId: threadId || response.data.threadId,
      streaming: false
    };
  } catch (error) {
    console.error('API: Error sending message:', error);
    if (axios.isAxiosError(error)) {
      console.error('API: Status:', error.response?.status);
      console.error('API: Response data:', error.response?.data);
    }
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
