import { Controller } from '@hotwired/stimulus';
import axios from 'axios'; // Import axios directly
// Removed import for '../app/services/api.js'

/*
 * Main controller for the chat application.
 * Handles:
 * - API communication (including auth, token refresh)
 * - Fetching initial data (models, chat history)
 * - Managing overall chat state (current thread, messages)
 * - Coordinating interactions between child controllers (model-selector, chat-history, chat-input)
 * - Sending messages to the backend
 * - Handling streaming responses
 */
export default class extends Controller {
    static targets = [
        "modelSelectorContainer",
        "chatHistoryContainer",
        "chatWindowMessages",
        "chatInputContainer",
        "loadingIndicator",
        "authLoadingIndicator",
        "authRequiredMessage",
        "mainAppContainer"
    ];

    static values = {
        models: Array,
        chatHistory: Array,
        currentMessages: Array,
        currentThreadId: String,
        selectedModelIds: Array,
        isAuthenticated: Boolean,
        isLoading: Boolean,
        userEmail: String,
    };

    api = null; // To hold the configured Axios instance
    isRefreshingToken = false; // Flag to prevent multiple refresh attempts

    connect() {
        console.log('Chat controller connected');
        this.#setupApi(); // Setup Axios instance and interceptors
        this.isAuthenticatedValue = false;
        this.isLoadingValue = true;
        this.authLoadingIndicatorTarget.hidden = false;
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = true;

        this.verifyAuthentication();
    }

    // --- Private API Setup & Helpers ---

    #setupApi() {
        this.api = axios.create({
            baseURL: '/api',
            headers: { 'Content-Type': 'application/json' },
        });

        // Request interceptor (add token, check refresh)
        this.api.interceptors.request.use(async (config) => {
            if (!config.url?.includes('/token/refresh')) {
                await this.#checkTokenRefresh();
            }
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Response interceptor (handle 401, retry)
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Avoid retry loops for refresh endpoint
                if (originalRequest.url?.includes('/token/refresh')) {
                    localStorage.removeItem('token');
                    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/callback')) {
                        window.location.href = '/login';
                    }
                    return Promise.reject(error);
                }

                // Handle 401: try refresh and retry original request
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true; // Mark to prevent infinite retry loops

                    if (!this.isRefreshingToken) { // Prevent multiple concurrent refresh attempts
                         this.isRefreshingToken = true;
                         console.log('Attempting token refresh due to 401 error');
                         try {
                             const refreshed = await this.#refreshToken();
                             if (refreshed) {
                                 console.log('Interceptor: Refresh successful, retrying original request.');
                                 // Update header for the retried request
                                 const token = localStorage.getItem('token');
                                 if (token) {
                                     originalRequest.headers['Authorization'] = `Bearer ${token}`;
                                     this.isRefreshingToken = false;
                                     return this.api(originalRequest); // Retry with new token
                                 } else {
                                      console.warn('Interceptor: Token missing after successful refresh attempt? Aborting retry.');
                                      this.isRefreshingToken = false;
                                      return Promise.reject(error);
                                 }
                             } else {
                                 console.log('Interceptor: Refresh failed or did not return a new token. Rejecting original request.');
                                 this.isRefreshingToken = false;
                                 // #refreshToken handles token removal on 401 failure. Redirect if needed.
                                 if (!this.#isAuthenticated()) {
                                     this.handleUnauthenticated(); // Update UI / redirect
                                 }
                                 return Promise.reject(error);
                             }
                         } catch (refreshError) {
                             console.error('Interceptor: Error during refresh attempt.', refreshError);
                             this.isRefreshingToken = false;
                             if (!this.#isAuthenticated()) {
                                 this.handleUnauthenticated(); // Update UI / redirect
                             }
                             return Promise.reject(error); // Reject with the original error
                         }
                    } else {
                         console.log("Interceptor: Token refresh already in progress, waiting...");
                         // Simple wait mechanism (could be improved with promises/event listeners)
                         await new Promise(resolve => setTimeout(resolve, 1000));
                         // Retry after waiting, assuming refresh completed
                         const token = localStorage.getItem('token');
                         if (token) {
                             originalRequest.headers['Authorization'] = `Bearer ${token}`;
                             return this.api(originalRequest);
                         } else {
                             return Promise.reject(error); // Refresh likely failed
                         }
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    #decodeToken(token) {
        try {
            if (!token) return null;
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = parts[1];
            const jsonPayload = atob(payload);
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    #isAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        const decodedToken = this.#decodeToken(token);
        if (!decodedToken) return false;
        if (decodedToken.exp) {
            const isExpired = decodedToken.exp < Date.now() / 1000;
            if (isExpired) return false; // Expired
        }
        return true; // Has token, not expired (or no expiry)
    }

    async #refreshToken() {
        console.log('Attempting token refresh...');
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.log('Refresh failed: No current token found.');
            return false;
        }

        try {
            // Use a basic axios instance to avoid interceptors during refresh
            const refreshApi = axios.create({ baseURL: '/api' });
            const response = await refreshApi.post('/token/refresh', {}, {
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${currentToken}`
                 }
            });

            const { token } = response.data;
            if (token) {
                console.log('New token received, updating localStorage.');
                localStorage.setItem('token', token);
                return true;
            } else {
                console.warn('Refresh successful but no token in response data.');
                return false;
            }
        } catch (error) {
            console.error('Error during token refresh API call:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                console.log('Refresh failed with 401, removing token.');
                localStorage.removeItem('token');
            } else {
                console.log('Refresh failed with non-401 error, token not removed.');
            }
            return false;
        }
    }

    async #checkTokenRefresh() {
        const token = localStorage.getItem('token');
        if (!token) return;
        const decodedToken = this.#decodeToken(token);
        if (!decodedToken || !decodedToken.exp) return;

        const expiresIn = decodedToken.exp - (Date.now() / 1000);
        if (expiresIn < 3600) { // Less than 1 hour
            console.log('Token nearing expiry, attempting proactive refresh.');
            if (!this.isRefreshingToken) { // Avoid concurrent refresh
                 this.isRefreshingToken = true;
                 try {
                     const refreshed = await this.#refreshToken();
                     console.log(`Proactive token refresh ${refreshed ? 'successful' : 'failed'}.`);
                 } finally {
                     this.isRefreshingToken = false;
                 }
            }
        }
    }

    // --- Core Controller Logic ---

    async verifyAuthentication() {
        console.log('Verifying authentication...');
        // Use the internal helper now
        if (this.#isAuthenticated()) {
            // Try a proactive refresh check just in case
            await this.#checkTokenRefresh();
            // Re-check after potential refresh
            if (this.#isAuthenticated()) {
                const token = localStorage.getItem('token');
                const payload = this.#decodeToken(token);
                this.userEmailValue = payload?.email || '';
                this.isAuthenticatedValue = true;
                console.log('Authentication successful');
                this.loadInitialData();
            } else {
                 // Refresh failed or token removed during check
                 this.handleUnauthenticated();
            }
        } else {
            this.handleUnauthenticated();
        }
        this.isLoadingValue = false;
        this.authLoadingIndicatorTarget.hidden = true;
    }

    handleUnauthenticated() {
        console.log('User is not authenticated');
        this.isAuthenticatedValue = false;
        localStorage.removeItem('token'); // Ensure token is removed
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = false;
        // Consider redirecting: window.location.href = '/login';
    }

    async loadInitialData() {
        if (!this.isAuthenticatedValue) return;
        console.log('Loading initial data...');
        this.mainAppContainerTarget.hidden = false;
        this.authRequiredMessageTarget.hidden = true;
        this.isLoadingValue = true;
        this.loadingIndicatorTarget.hidden = false;

        try {
            // Use the controller's api instance
            const [modelsResponse, historyResponse] = await Promise.all([
                this.fetchModels(), // Uses internal method now
                this.fetchChatHistory() // Uses internal method now
            ]);
            // Assuming fetchModels/fetchChatHistory now return the data directly
            this.modelsValue = modelsResponse;
            this.chatHistoryValue = historyResponse;

            this.dispatch('modelsLoaded', { detail: { models: this.modelsValue } });
            this.dispatch('historyLoaded', { detail: { history: this.chatHistoryValue } });
            console.log('Initial data loaded:', { models: this.modelsValue.length, history: this.chatHistoryValue.length });
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.hidden = true;
        }
    }

    async fetchModels() {
        console.log('Fetching models...');
        try {
            const cachedModels = localStorage.getItem('stimulus_models');
            if (cachedModels) {
                console.log('Using cached models');
                return JSON.parse(cachedModels);
            }
            console.log('Fetching models from API');
            // Use controller's api instance
            const response = await this.api.get('/models');
            if (response.data && Array.isArray(response.data)) {
                localStorage.setItem('stimulus_models', JSON.stringify(response.data));
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
            return []; // Return empty array on error
        }
    }

    async fetchChatHistory() {
        console.log('Fetching chat history...');
        try {
            // Use controller's api instance
            const response = await this.api.get('/chat/history');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching chat history:', error);
             if (axios.isAxiosError(error)) {
                 console.error('API Status:', error.response?.status);
                 console.error('API Response data:', error.response?.data);
            }
            return []; // Return empty array on error
        }
    }

    handleModelSelectionChange({ detail: { selectedIds } }) {
        console.log('Selected models changed:', selectedIds);
        this.selectedModelIdsValue = selectedIds;
        this.dispatch('modelSelectionUpdated', { detail: { selectedIds: this.selectedModelIdsValue } });
    }

    async handleSendMessage({ detail: { prompt } }) {
        if (!prompt.trim() || this.selectedModelIdsValue.length === 0 || this.isLoadingValue) return;

        console.log('Sending message:', prompt, 'to models:', this.selectedModelIdsValue, 'thread:', this.currentThreadIdValue);
        this.isLoadingValue = true;
        this.loadingIndicatorTarget.hidden = false;
        this.dispatch('sendStart');

        const userMessage = { role: 'user', content: prompt, id: `msg_${Date.now()}`, threadId: this.currentThreadIdValue || null };
        this.appendMessageToDOM(userMessage);
        this.currentMessagesValue = [...this.currentMessagesValue, userMessage];

        const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const modelPlaceholders = this.selectedModelIdsValue.map(modelId => ({
            role: 'assistant', content: '...', modelId, id: `msg_${Date.now()}_${modelId}`,
            threadId: this.currentThreadIdValue || null, promptId, isPlaceholder: true
        }));
        modelPlaceholders.forEach(placeholder => this.appendMessageToDOM(placeholder));
        this.currentMessagesValue = [...this.currentMessagesValue, ...modelPlaceholders];

        // Determine if streaming should be used (based on model capability and settings)
        const modelsData = this.modelsValue || [];
        const selectedSupportsStreaming = modelsData
            .filter(m => this.selectedModelIdsValue.includes(m.id))
            .some(m => m.supportsStreaming);
        // Simple streaming logic: only if one model selected and it supports streaming
        const useStreaming = this.selectedModelIdsValue.length === 1 && selectedSupportsStreaming;

        try {
            // Use controller's api instance
            const response = await this.api.post('/chat', {
                prompt,
                models: this.selectedModelIdsValue,
                threadId: this.currentThreadIdValue || undefined,
                promptId,
                stream: useStreaming // Pass stream flag
            });

            console.log('API Response:', response.data);

            // Update thread ID if it's a new thread
            if (!this.currentThreadIdValue && response.data.threadId) {
                this.currentThreadIdValue = response.data.threadId;
                console.log('New thread created:', this.currentThreadIdValue);
                this.currentMessagesValue = this.currentMessagesValue.map(msg => ({ ...msg, threadId: msg.threadId || this.currentThreadIdValue }));
            }

            // Handle non-streaming response (update placeholders)
            if (!useStreaming && response.data.responses) {
                 Object.entries(response.data.responses).forEach(([modelId, data]) => {
                    this.updatePlaceholderMessage(promptId, modelId, data.content, data.usage);
                });
            } else if (useStreaming) {
                 // Streaming is handled by the backend sending Server-Sent Events
                 // We need an EventSource listener here, NOT in the post response.
                 // The backend /chat endpoint needs modification to return immediately
                 // for stream=true, and the actual stream happens via a separate mechanism
                 // (or the StreamedResponse setup in PHP controller needs careful handling client-side).

                 // TODO: Implement EventSource listener for streaming updates
                 console.warn("Streaming response expected via EventSource, but client-side listener is not implemented in this refactor.");
                 // For now, just remove placeholders after a delay as a fallback
                 setTimeout(() => this.removePlaceholders(promptId), 5000);
            }

            // Refresh chat history
            this.chatHistoryValue = await this.fetchChatHistory();
            this.dispatch('historyLoaded', { detail: { history: this.chatHistoryValue } });

        } catch (error) {
            console.error('Error sending message:', error);
            this.removePlaceholders(promptId);
            const errorMessage = { role: 'system', content: `Error: Failed to get response. ${error.message || ''}`, id: `error_${Date.now()}`, threadId: this.currentThreadIdValue || null };
            this.appendMessageToDOM(errorMessage);
            this.currentMessagesValue = [...this.currentMessagesValue, errorMessage];
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.hidden = true;
            this.dispatch('sendEnd');
        }
    }

    // Placeholder for stream update - needs proper EventSource implementation
    handleStreamUpdate(modelId, contentChunk, promptId, threadId) {
        console.log(`Stream update (via EventSource - TBD) for ${modelId} (Prompt: ${promptId}):`, contentChunk);
        const placeholderElement = this.chatWindowMessagesTarget.querySelector(`[data-prompt-id="${promptId}"][data-model-id="${modelId}"]`);
        if (placeholderElement) {
            const contentElement = placeholderElement.querySelector('[data-role="content"]');
            if (contentElement) {
                 // Append chunk? Replace? Depends on stream format.
                 contentElement.textContent += contentChunk; // Simple append example
                 placeholderElement.removeAttribute('data-placeholder');
            }
            if (!this.currentThreadIdValue && threadId) {
                this.currentThreadIdValue = threadId;
            }
        }
    }

    updatePlaceholderMessage(promptId, modelId, finalContent, usage) {
        const messageIndex = this.currentMessagesValue.findIndex(msg => msg.promptId === promptId && msg.modelId === modelId && msg.role === 'assistant');
        if (messageIndex !== -1) {
            const updatedMessages = [...this.currentMessagesValue];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: finalContent, usage: usage, isPlaceholder: false };
            this.currentMessagesValue = updatedMessages;

            const placeholderElement = this.chatWindowMessagesTarget.querySelector(`[data-prompt-id="${promptId}"][data-model-id="${modelId}"]`);
            if (placeholderElement) {
                const contentElement = placeholderElement.querySelector('[data-role="content"]');
                if (contentElement) contentElement.textContent = finalContent;
                placeholderElement.removeAttribute('data-placeholder');
                const usageElement = placeholderElement.querySelector('[data-role="usage"]');
                if (usageElement && usage) usageElement.textContent = `(Tokens: ${usage.total_tokens})`; else if (usageElement) usageElement.textContent = '';
            }
        } else {
             console.warn(`Could not find placeholder message in state for model ${modelId} and prompt ${promptId} to update.`);
             const finalMessage = { role: 'assistant', content: finalContent, modelId, id: `msg_${Date.now()}_${modelId}_final`, threadId: this.currentThreadIdValue || null, promptId, usage: usage };
             this.appendMessageToDOM(finalMessage);
             this.currentMessagesValue = [...this.currentMessagesValue, finalMessage];
        }
    }

    removePlaceholders(promptId) {
        this.currentMessagesValue = this.currentMessagesValue.filter(msg => !(msg.promptId === promptId && msg.role === 'assistant' && msg.isPlaceholder));
        this.chatWindowMessagesTarget.querySelectorAll(`[data-prompt-id="${promptId}"][data-role="assistant"][data-placeholder="true"]`).forEach(el => el.remove());
    }

    async handleSelectChat({ detail: { threadId } }) {
        console.log('Selecting chat thread:', threadId);
        if (this.currentThreadIdValue === threadId) return;

        this.isLoadingValue = true;
        this.loadingIndicatorTarget.hidden = false;
        this.clearChatWindow();

        try {
            // Use controller's api instance
            const response = await this.api.get(`/chat/thread/${threadId}`);
            const history = response.data; // Assuming data is { messages: [], threadId: ... }

            this.currentThreadIdValue = threadId;
            // The API returns messages grouped by prompt, need to flatten/adapt
            // This needs adjustment based on the actual structure returned by /chat/thread/{threadId}
            // Assuming history.messages is the array needed by appendMessageToDOM
            this.currentMessagesValue = this.#flattenHistory(history.messages || []); // Adapt based on actual API response structure

            this.currentMessagesValue.forEach(msg => this.appendMessageToDOM(msg));

            const modelIdsInThread = [...new Set(this.currentMessagesValue.filter(m => m.role === 'assistant' && m.modelId).map(m => m.modelId))];
            this.selectedModelIdsValue = modelIdsInThread;
            this.dispatch('setSelectedModels', { detail: { selectedIds: modelIdsInThread } });

            console.log('Chat loaded:', threadId, 'Messages:', this.currentMessagesValue.length);
        } catch (error) {
            console.error('Error loading thread history:', error);
            const errorMessage = { role: 'system', content: `Error: Failed to load chat history. ${error.message || ''}`, id: `error_load_${Date.now()}`, threadId: null };
            this.appendMessageToDOM(errorMessage);
            this.currentThreadIdValue = null;
            this.currentMessagesValue = [errorMessage];
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.hidden = true;
            this.scrollToBottom();
        }
    }

     // Helper to flatten the grouped history from the API if needed
    #flattenHistory(groupedMessages) {
        const flatMessages = [];
        groupedMessages.forEach(group => {
            // Add user message
            flatMessages.push({
                role: 'user',
                content: group.prompt,
                id: `user_${group.promptId || Date.now()}`, // Generate ID if missing
                threadId: this.currentThreadIdValue,
                promptId: group.promptId
            });
            // Add assistant responses
            if (group.responses) {
                Object.entries(group.responses).forEach(([modelId, responseData]) => {
                     flatMessages.push({
                         role: 'assistant',
                         content: responseData.content,
                         modelId: modelId,
                         id: `asst_${group.promptId || Date.now()}_${modelId}`, // Generate ID
                         threadId: this.currentThreadIdValue,
                         promptId: group.promptId,
                         usage: responseData.usage
                     });
                });
            }
        });
        return flatMessages;
    }


    async handleStartNewChat() {
        console.log('Starting new chat...');
        this.isLoadingValue = true;
        this.loadingIndicatorTarget.hidden = false;

        try {
            // Use controller's api instance
            const response = await this.api.post('/chat/thread');
            const { threadId } = response.data;
            console.log('New thread created:', threadId);

            this.currentThreadIdValue = threadId;
            this.currentMessagesValue = [];
            this.selectedModelIdsValue = [];
            this.clearChatWindow();
            this.dispatch('setSelectedModels', { detail: { selectedIds: [] } });

            this.chatHistoryValue = await this.fetchChatHistory();
            this.dispatch('historyLoaded', { detail: { history: this.chatHistoryValue } });
        } catch (error) {
            console.error('Error starting new chat:', error);
             const errorMessage = { role: 'system', content: `Error: Failed to start new chat. ${error.message || ''}`, id: `error_new_${Date.now()}`, threadId: null };
            this.appendMessageToDOM(errorMessage);
        } finally {
             this.isLoadingValue = false;
             this.loadingIndicatorTarget.hidden = true;
        }
    }

    // --- UI Helpers ---

    clearChatWindow() {
        this.chatWindowMessagesTarget.innerHTML = '';
    }

    appendMessageToDOM(message) {
        const messageElement = document.createElement('div');
        // Add base classes, role-specific classes, dataset attributes
        messageElement.classList.add('message', `message--${message.role}`);
        messageElement.dataset.messageId = message.id;
        if (message.modelId) messageElement.dataset.modelId = message.modelId;
        if (message.promptId) messageElement.dataset.promptId = message.promptId;
        if (message.role === 'assistant') messageElement.dataset.role = 'assistant';
        if (message.isPlaceholder) messageElement.dataset.placeholder = 'true';

        let contentHTML = '';
        let modelName = 'User';
        if (message.role === 'assistant') {
             modelName = this.modelsValue.find(m => m.id === message.modelId)?.name || 'Assistant';
        }

        // Basic structure - Adapt based on desired layout (e.g., grid for assistant)
        // This simplified version puts each message on a new line.
        contentHTML = `
            <div class="message-header font-semibold ${message.role === 'user' ? 'text-blue-600' : 'text-green-600'}">${modelName}</div>
            <div class="message-content ${message.role === 'assistant' ? 'assistant-content' : ''}" data-role="content">${message.content || ''}</div>
            ${message.usage ? `<div class="message-usage text-xs text-gray-500" data-role="usage">(Tokens: ${message.usage.total_tokens})</div>` : ''}
        `;
         if (message.isPlaceholder) {
             contentHTML += `<span class="inline-block ml-1 animate-pulse">▊</span>`;
         }


        messageElement.innerHTML = contentHTML;
        // TODO: Group assistant messages under user message if desired layout needs it.
        // This simple append adds each message sequentially.
        this.chatWindowMessagesTarget.appendChild(messageElement);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatWindowMessagesTarget.scrollTop = this.chatWindowMessagesTarget.scrollHeight;
    }

    // --- Logout ---
    logout() {
        console.log('Logging out...');
        localStorage.removeItem('token');
        window.location.href = '/login'; // Redirect to login
    }

    disconnect() {
        console.log('Chat controller disconnected');
        // Cleanup? Remove EventSource listener if implemented.
    }
}
