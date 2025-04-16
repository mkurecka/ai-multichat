import axios from 'axios';
import { AxiosRequestConfig } from 'axios';

// Remove mock data imports as they are no longer used
// import mockChatHistory from '../mocks/data/chatHistory.json';
// import mockPromptTemplates from '../mocks/data/promptTemplates.json';
// import mockChatResponse from '../mocks/data/chatResponse.json';
// import mockChatCosts from '../mocks/data/chatCosts.json';

// --- Interfaces based on API Documentation ---

interface ModelPricing {
  prompt: number | null;
  completion: number | null;
  unit: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  provider: string;
  selected: boolean;
  pricing: ModelPricing;
  supportsStreaming: boolean;
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ResponseDetail {
  content: string;
  usage: Usage;
  error?: string | null;
}

export interface MessageGroup {
  prompt: string;
  responses: { [modelId: string]: ResponseDetail };
  createdAt: string;
  promptId: string;
}

export interface ChatThread {
  id: number;
  title: string;
  messages: MessageGroup[];
  threadId: string;
  createdAt: string;
}

export interface ThreadHistoryResponse {
    messages: MessageGroup[];
    threadId: string;
}

export interface PromptTemplateMessage {
    id?: number; // Optional for creation/update
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface PromptTemplate {
    id: number; // Use number based on existing functions
    name: string; // Assuming 'name' based on mock data? Or should this be 'title'? Check backend.
    description?: string;
    scope: 'private' | 'organization';
    associatedModel: Model | { id: string }; // Allow sending just ID for create/update
    messages: PromptTemplateMessage[];
    owner?: { id: number; email: string }; // Optional for creation
    organization?: { id: number; name: string } | null; // Optional for creation
    createdAt?: string;
    updatedAt?: string;
}

export interface ChatRequest {
    userInput: string;
    templateId?: number; // Make optional if it can be omitted
    promptId: string; // Frontend generated unique ID
    threadId?: string | null;
    stream?: boolean;
    models?: string[]; // Add optional models array
}

export interface ChatResponse {
    responses: { [modelId: string]: ResponseDetail };
    threadId: string;
    promptId: string;
}

export interface ThreadCost {
    threadId: string;
    title: string;
    messageCount: number;
    lastMessageDate: string;
    totalCost: number;
    totalTokens: number;
}

export interface UserOrganization {
    id: number;
    domain: string;
    googleId: string;
    usageCount: number;
    templatesCount: number;
}

export interface UserUsage {
    totalPrompts: number;
    totalTokens: number;
    totalCost: number;
    formattedCost: string;
    promptTokens: number;
    completionTokens: number;
    averageCostPerPrompt: number;
    averageTokensPerPrompt: number;
}

export interface UserModelUsage {
    modelId: string;
    useCount: number;
    modelCost: number;
    modelTokens: number;
}

export interface UserConversation {
    threadId: string;
    title: string;
    messageCount: number;
    createdAt: string;
    totalCost: number;
    totalTokens: number;
}

export interface UserDailyActivity {
    date: string;
    requestCount: number;
    dailyCost: number;
    dailyTokens: number;
}

export interface UserProfile {
    id: number;
    email: string;
    roles: string[];
    googleId: string;
    organization?: UserOrganization;
    usage: UserUsage;
    templates: {
        privateCount: number;
    };
    conversations: {
        count: number;
    };
    models: {
        mostUsed: UserModelUsage[];
    };
    recentConversations: UserConversation[];
    activity: {
        daily: UserDailyActivity[];
    };
}

// --- API Client Implementation ---

// Read API Base URL from environment variable, with a fallback for safety
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
console.log(`Using API Base URL: ${API_BASE_URL}`); // Log the URL being used

// Explicitly remove the USE_MOCKS constant as it's no longer needed here
// const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Authorization header would be added here dynamically if JWT is available
  },
});

// Add an interceptor to include the JWT token in requests
apiClient.interceptors.request.use(
  (config) => {
    // Don't add auth header for login requests
    if (config.url === '/login_check') {
      console.log('Interceptor: Skipping auth header for /login_check');
      return config;
    }
    const token = localStorage.getItem('authToken');
    if (token) {
      // Add logging to confirm header addition
      console.log(`Interceptor: Adding auth header for ${config.url}`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Add logging if no token is found
      console.log(`Interceptor: No token found in localStorage for ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Remove mock delay function
// const mockDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Functions ---

export const getModels = async (): Promise<Model[]> => {
  // Always fetch from the real API
  console.log('Fetching models from API: /models');
  const response = await apiClient.get<Model[]>('/models');
  return response.data;
};

export const getChatHistory = async (): Promise<ChatThread[]> => {
    console.log('Fetching chat history from API: /chat/history');
    const response = await apiClient.get<ChatThread[]>('/chat/history');
    return response.data;
};

export const getThreadHistory = async (threadId: string): Promise<ThreadHistoryResponse> => {
    console.log(`Fetching thread history from API: /chat/thread/${threadId}`);
    const response = await apiClient.get<ThreadHistoryResponse>(`/chat/thread/${threadId}`);
    return response.data;
};

export const sendChatMessage = async (data: ChatRequest): Promise<ChatResponse> => {
    console.log('Sending chat message via API: POST /chat', data);
    // Handle streaming vs non-streaming requests appropriately if needed
    // For now, assuming non-streaming based on the previous structure
    const response = await apiClient.post<ChatResponse>('/chat', data);
    return response.data;
    // Streaming would involve using fetch with appropriate headers and handling text/event-stream
};

export const getAllPromptTemplates = async (): Promise<PromptTemplate[]> => {
    console.log('Fetching all prompt templates from API: /prompt-templates');
    // Fix the double /api/ issue by using the full URL without the baseURL
    const response = await axios.get<PromptTemplate[]>(`${API_BASE_URL}/prompt-templates`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const getChatCosts = async (): Promise<ThreadCost[]> => {
    console.log('Fetching chat costs from API: /chat/costs');
    const response = await apiClient.get<ThreadCost[]>('/chat/costs');
    return response.data;
};

// --- Authentication ---

interface LoginCredentials {
    username: string; // Assuming email is used as username based on typical Symfony setups
    password?: string; // Make password optional for type safety if needed elsewhere
}

interface LoginResponse {
    token: string; // JWT
}

export const loginUser = async (credentials: LoginCredentials): Promise<string | null> => {
    // Login should always hit the real API, regardless of USE_MOCKS
    try {
        console.log('Attempting login via API: /login_check');
        const response = await apiClient.post<LoginResponse>('/login_check', credentials);
        const token = response.data.token;
        if (token) {
            localStorage.setItem('authToken', token); // Store token
            // Re-configure default header for subsequent requests in this session
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
        return null;
    } catch (error) {
        console.error("Login failed:", error);
        localStorage.removeItem('authToken'); // Clear token on failure
        delete apiClient.defaults.headers.common['Authorization'];
        // Rethrow or handle specific error messages
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            throw new Error("Invalid credentials.");
        }
        throw new Error("Login failed. Please try again.");
    }
};

export const logoutUser = () => {
    localStorage.removeItem('authToken');
    delete apiClient.defaults.headers.common['Authorization'];
    // Optionally: notify backend about logout if needed
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

// Update function signature to accept redirectUri
export const handleGoogleCallback = async (code: string, redirectUri: string): Promise<string | null> => {
    try {
        console.log('Sending Google auth code to API: /auth/google/callback');
        const response = await apiClient.post<LoginResponse>('/auth/google/callback', {
            code: code,
            redirectUri: redirectUri // Send the redirect URI used by the frontend
        });
        const token = response.data.token;
        if (token) {
            localStorage.setItem('authToken', token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
        return null;
    } catch (error) {
        console.error('Google auth callback failed:', error);
        localStorage.removeItem('authToken');
        return null;
    }
};

// --- Add other API functions as needed (create/update/delete templates, etc.) ---
// Example:
// export const createPromptTemplate = async (templateData: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'owner' | 'organization'>): Promise<PromptTemplate> => {
//     if (USE_MOCKS) {
//         console.log('Using mock data for createPromptTemplate');
//         await mockDelay();
//         const newId = Math.max(...mockPromptTemplates.map(t => t.id)) + 1;
//         const newTemplate = {
//             ...templateData,
//             id: newId,
//             associatedModel: mockModels.find(m => m.id === (templateData.associatedModel as {id: string}).id) || mockModels[0], // Find full model or default
//             scope: templateData.scope || 'private',
//             owner: { id: 99, email: "mock@user.com" }, // Mock owner
//             organization: null,
//             createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
//             updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
//         };
//         // Note: This doesn't actually *add* it to the mockPromptTemplates array in memory
//         // for subsequent calls within the same session unless you modify the imported array.
//         return newTemplate as PromptTemplate;
//     }
//     const response = await apiClient.post<PromptTemplate>('/prompt-templates', templateData);
//     return response.data;
// }

export const createPromptTemplate = async (templateData: Omit<PromptTemplate, 'id' | 'owner' | 'organization' | 'createdAt' | 'updatedAt'> & { associatedModel: { id: string } }): Promise<PromptTemplate> => {
    console.log('Creating prompt template via API: POST /prompt-templates', templateData);
    // Fix the double /api/ issue by using the full URL without the baseURL
    const response = await axios.post<PromptTemplate>(`${API_BASE_URL}/prompt-templates`, templateData, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const getPromptTemplate = async (id: number): Promise<PromptTemplate> => {
    console.log(`Fetching prompt template by ID from API: /prompt-templates/${id}`);
    // Fix the double /api/ issue by using the full URL without the baseURL
    const response = await axios.get<PromptTemplate>(`${API_BASE_URL}/prompt-templates/${id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const updatePromptTemplate = async (id: number, templateData: Partial<Omit<PromptTemplate, 'id' | 'owner' | 'organization' | 'createdAt' | 'updatedAt'> & { associatedModel?: { id: string } }>): Promise<PromptTemplate> => {
    console.log(`Updating prompt template via API: PATCH /prompt-templates/${id}`, templateData);
    // Fix the double /api/ issue by using the full URL without the baseURL
    const response = await axios.patch<PromptTemplate>(`${API_BASE_URL}/prompt-templates/${id}`, templateData, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const deletePromptTemplate = async (id: number): Promise<void> => {
    console.log(`Deleting prompt template via API: DELETE /prompt-templates/${id}`);
    // Fix the double /api/ issue by using the full URL without the baseURL
    await axios.delete(`${API_BASE_URL}/prompt-templates/${id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        }
    });
};

export const getUserProfile = async (): Promise<UserProfile> => {
    console.log('Fetching user profile from API: GET /user/profile');
    const response = await apiClient.get<UserProfile>('/user/profile');
    return response.data;
};

// Function to create a new thread explicitly if needed
export const createNewThread = async (): Promise<{ threadId: string }> => {
    console.log('Creating new thread via API: POST /chat/thread');
    const response = await apiClient.post<{ threadId: string }>('/chat/thread');
    return response.data;
};

export default apiClient;
