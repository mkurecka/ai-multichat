import axios from 'axios';

// Import mock data
// import mockModels from '../mocks/data/models.json'; // Removed mock import for models
import mockChatHistory from '../mocks/data/chatHistory.json';
import mockPromptTemplates from '../mocks/data/promptTemplates.json';
import mockChatResponse from '../mocks/data/chatResponse.json';
import mockChatCosts from '../mocks/data/chatCosts.json';

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

interface MessageGroup {
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

interface PromptTemplateMessage {
    id?: number; // Optional for creation/update
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface PromptTemplate {
    id: number;
    name: string;
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
    templateId: number;
    promptId: string; // Frontend generated unique ID
    threadId?: string | null;
    stream?: boolean;
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

// --- API Client Implementation ---

// Read API Base URL from environment variable, with a fallback for safety
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
console.log(`Using API Base URL: ${API_BASE_URL}`); // Log the URL being used

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

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


// Function to simulate delay for mock responses
const mockDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (USE_MOCKS) {
        console.log(`Using mock data for getThreadHistory (threadId: ${threadId})`);
        await mockDelay();
        // Find the specific thread in the mock history
        const thread = mockChatHistory.find(t => t.threadId === threadId);
        if (!thread) {
            throw new Error(`Mock thread with ID ${threadId} not found.`);
        }
        return { messages: JSON.parse(JSON.stringify(thread.messages)), threadId: thread.threadId };
    }
    const response = await apiClient.get<ThreadHistoryResponse>(`/chat/thread/${threadId}`);
    return response.data;
};


export const sendChatMessage = async (data: ChatRequest): Promise<ChatResponse> => {
    // Note: Mocking streaming responses is complex and not implemented here.
    // This mock only covers the non-streaming case.
    if (USE_MOCKS) {
        console.log('Using mock data for sendChatMessage (non-streaming)');
        await mockDelay(800);
        // Return a slightly modified response based on input
        const response = JSON.parse(JSON.stringify(mockChatResponse));
        response.threadId = data.threadId || `new-mock-thread-${Date.now()}`;
        response.promptId = data.promptId;
        // Simulate response based on a known model from the template (if possible)
        const template = mockPromptTemplates.find(t => t.id === data.templateId);
        if (template && typeof template.associatedModel === 'object' && 'id' in template.associatedModel) {
             const modelId = template.associatedModel.id;
             // Ensure the response structure matches the model ID
             if (!response.responses[modelId]) {
                 const firstModelKey = Object.keys(response.responses)[0];
                 if (firstModelKey) {
                    response.responses[modelId] = response.responses[firstModelKey];
                    delete response.responses[firstModelKey];
                 }
             }
        }

        return response;
    }
    // For actual API call, handle potential streaming differently if needed
    if (data.stream) {
        console.warn("Streaming not fully implemented in this basic client/mock setup.");
        // Fallback to non-streaming or implement SSE handling
    }
    const response = await apiClient.post<ChatResponse>('/chat', data);
    return response.data;
};


export const getPromptTemplates = async (): Promise<PromptTemplate[]> => {
    if (USE_MOCKS) {
        console.log('Using mock data for getPromptTemplates');
        await mockDelay();
        return JSON.parse(JSON.stringify(mockPromptTemplates));
    }
    const response = await apiClient.get<PromptTemplate[]>('/prompt-templates');
    return response.data;
};

export const getChatCosts = async (): Promise<ThreadCost[]> => {
    if (USE_MOCKS) {
        console.log('Using mock data for getChatCosts');
        await mockDelay();
        return JSON.parse(JSON.stringify(mockChatCosts));
    }
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
    // This function sends the code and redirectUri received from Google to our backend
    console.log(`handleGoogleCallback: Sending code and redirectUri to /auth/google/callback`, { code, redirectUri }); // Log parameters
    try {
        // Include redirectUri in the request body
        const response = await apiClient.post<LoginResponse>('/auth/google/callback', { code, redirectUri });
        const token = response.data.token;
        if (token) {
            localStorage.setItem('authToken', token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
        return null;
    } catch (error) {
        console.error("Google callback handling failed:", error);
        localStorage.removeItem('authToken'); // Clear token on failure
        delete apiClient.defaults.headers.common['Authorization'];
        if (axios.isAxiosError(error)) {
             if (error.response?.status === 401) {
                throw new Error("Google authentication failed or user not authorized.");
             }
             if (error.response?.status === 400) {
                throw new Error("Invalid request during Google callback (missing/bad code?).");
             }
        }
        throw new Error("Google callback failed. Please try again.");
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

export default apiClient;
