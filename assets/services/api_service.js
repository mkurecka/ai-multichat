import axios from 'axios';

/**
 * API Service for handling all API communication
 */
export default class ApiService {
    constructor() {
        this.api = axios.create({
            baseURL: '/api',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            withCredentials: true
        });

        // Set up response interceptors
        this.setupInterceptors();
    }

    /**
     * Set up request and response interceptors
     */
    setupInterceptors() {
        // Response interceptor (handle 401)
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                // Handle 401 Unauthorized errors
                if (error.response?.status === 401) {
                    console.log('Received 401 Unauthorized response');
                    console.log('Error details:', error.response?.data);

                    // Dispatch an event that the main controller can listen for
                    const event = new CustomEvent('api:unauthorized', {
                        detail: { error: error.response?.data }
                    });
                    document.dispatchEvent(event);
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get models from the API
     * @returns {Promise<Array>} Array of model objects
     */
    async getModels() {
        try {
            console.log('Fetching models from API');
            const response = await this.api.get('/models');
            console.log('API response for models:', response);

            if (response.data && Array.isArray(response.data)) {
                console.log(`Received ${response.data.length} models from API:`, response.data);
                return response.data;
            }

            console.error('Invalid models response:', response.data);
            return [];
        } catch (error) {
            console.error('Error fetching models:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }

            // Return some dummy models for testing if API fails
            console.log('Returning dummy models for testing');
            const dummyModels = [
                { id: 'model1', name: 'Model 1', supportsStreaming: true },
                { id: 'model2', name: 'Model 2', supportsStreaming: false },
                { id: 'model3', name: 'Model 3', supportsStreaming: true }
            ];
            return dummyModels;
        }
    }

    /**
     * Get chat history from the API
     * @returns {Promise<Array>} Array of chat history objects
     */
    async getChatHistory() {
        console.log('Fetching chat history...');
        try {
            const response = await this.api.get('/chat/history');
            console.log('Chat history response:', response.data);
            const history = response.data || [];
            console.log(`Received ${history.length} history items`);
            return history;
        } catch (error) {
            console.error('Error fetching chat history:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }
            return []; // Return empty array on error
        }
    }

    /**
     * Get a specific thread from the API
     * @param {string} threadId - The ID of the thread to fetch
     * @returns {Promise<Object|null>} Thread data or null if error
     */
    async getThread(threadId) {
        console.log('Fetching thread:', threadId);
        try {
            const response = await this.api.get(`/chat/thread/${threadId}`);
            console.log('Thread response:', response.data);
            return response.data;
        } catch (error) {
            console.error(`Error fetching thread ${threadId}:`, error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }
            return null;
        }
    }

    /**
     * Create a new thread
     * @returns {Promise<Object>} New thread data
     */
    async createThread() {
        console.log('Creating new thread...');
        try {
            const response = await this.api.post('/chat/thread');
            console.log('New thread created:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error creating new thread:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Get template info from the API
     * @param {number|string} templateId - The ID of the template to fetch
     * @returns {Promise<Object|null>} Template data or null if error
     */
    async getTemplateInfo(templateId) {
        try {
            console.log(`Fetching template info for ID ${templateId}`);
            const response = await this.api.get(`/prompt-templates/${templateId}`);
            console.log(`Template info response:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`Error fetching template ${templateId}:`, error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }
            return null;
        }
    }

    /**
     * Send a non-streaming chat message
     * @param {Object} params - Parameters for the chat message
     * @returns {Promise<Object>} Response data
     */
    async sendChatMessage(params) {
        console.log('Sending chat message with params:', params);
        try {
            const response = await this.api.post('/chat', {
                ...params,
                stream: false
            });
            console.log('Chat message response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending chat message:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Status:', error.response?.status);
                console.error('API Response data:', error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Get the API instance for direct use
     * @returns {Object} Axios instance
     */
    getApiInstance() {
        return this.api;
    }
}
