import axios from 'axios';
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
apiClient.interceptors.request.use((config) => {
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
    }
    else {
        // Add logging if no token is found
        console.log(`Interceptor: No token found in localStorage for ${config.url}`);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Remove mock delay function
// const mockDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));
// --- API Functions ---
export const getModels = async () => {
    // Always fetch from the real API
    console.log('Fetching models from API: /models');
    const response = await apiClient.get('/models');
    return response.data;
};
export const getChatHistory = async () => {
    console.log('Fetching chat history from API: /chat/history');
    const response = await apiClient.get('/chat/history');
    return response.data;
};
export const getThreadHistory = async (threadId) => {
    console.log(`Fetching thread history from API: /chat/thread/${threadId}`);
    const response = await apiClient.get(`/chat/thread/${threadId}`);
    return response.data;
};
export const sendChatMessage = async (data) => {
    console.log('Sending chat message via API: POST /chat', data);
    // Handle streaming vs non-streaming requests appropriately if needed
    // For now, assuming non-streaming based on the previous structure
    const response = await apiClient.post('/chat', data);
    return response.data;
    // Streaming would involve using fetch with appropriate headers and handling text/event-stream
};
export const getAllPromptTemplates = async () => {
    console.log('Fetching all prompt templates from API: /prompt-templates');
    const response = await apiClient.get('/prompt-templates');
    return response.data;
};
export const getChatCosts = async () => {
    console.log('Fetching chat costs from API: /chat/costs');
    const response = await apiClient.get('/chat/costs');
    return response.data;
};
export const loginUser = async (credentials) => {
    // Login should always hit the real API, regardless of USE_MOCKS
    try {
        console.log('Attempting login via API: /login_check');
        const response = await apiClient.post('/login_check', credentials);
        const token = response.data.token;
        if (token) {
            localStorage.setItem('authToken', token); // Store token
            // Re-configure default header for subsequent requests in this session
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        }
        return null;
    }
    catch (error) {
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
export const getAuthToken = () => {
    return localStorage.getItem('authToken');
};
// Update function signature to accept redirectUri
export const handleGoogleCallback = async (code, redirectUri) => {
    try {
        console.log('Sending Google auth code to API: /auth/google/callback');
        const response = await apiClient.post('/auth/google/callback', {
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
    }
    catch (error) {
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
export const createPromptTemplate = async (templateData) => {
    console.log('Creating prompt template via API: POST /prompt-templates', templateData);
    const response = await apiClient.post('/prompt-templates', templateData);
    return response.data;
};
export const getPromptTemplate = async (id) => {
    console.log(`Fetching prompt template by ID from API: /prompt-templates/${id}`);
    const response = await apiClient.get(`/prompt-templates/${id}`);
    return response.data;
};
export const updatePromptTemplate = async (id, templateData) => {
    console.log(`Updating prompt template via API: PUT /prompt-templates/${id}`, templateData);
    const response = await apiClient.put(`/prompt-templates/${id}`, templateData);
    return response.data;
};
export const deletePromptTemplate = async (id) => {
    console.log(`Deleting prompt template via API: DELETE /prompt-templates/${id}`);
    await apiClient.delete(`/prompt-templates/${id}`);
};
// Function to create a new thread explicitly if needed
export const createNewThread = async () => {
    console.log('Creating new thread via API: POST /chat/thread');
    const response = await apiClient.post('/chat/thread');
    return response.data;
};
export default apiClient;
