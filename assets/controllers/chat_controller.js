import { Controller } from '@hotwired/stimulus';
// Removed axios import
import ApiService from '../services/api_service.js';
import AuthService from '../services/auth_service.js';
import HistoryService from '../services/history_service.js';
import MessageService from '../services/message_service.js';
import NotificationService from '../services/notification_service.js';
import StreamingService from '../services/streaming_service.js';
import TemplateService from '../services/template_service.js';

/*
 * Main controller for the chat application.
 * Coordinates interactions between services and child controllers.
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
        "templateSelectorContainer",
        "chatHistoryContainer",
        "chatWindowMessages",
        "chatInputContainer",
        "loadingIndicator",
        "authLoadingIndicator",
        "authRequiredMessage",
        "mainAppContainer",
        "headerNav",
        "userEmail",
        "mobileMenu",
        "chatHistorySidebar",
        "sidebarOverlay"
    ];

    static values = {
        models: Array,
        chatHistory: Array,
        currentMessages: Array,
        currentThreadId: String,
        selectedModelIds: Array,
        selectedTemplateId: Number,
        isAuthenticated: Boolean,
        isLoading: Boolean,
        userEmail: String,
    };

    static outlets = ['chat-history', 'template-selector'];

    // Services
    apiService = null;
    authService = null;
    historyService = null;
    messageService = null;
    notificationService = null;
    streamingService = null;
    templateService = null;

    // Internal state
    // Removed _templateCache - managed by TemplateService
    isRefreshingToken = false; // Flag to prevent multiple refresh attempts (may be removable after refactor)

    connect() {
        console.log('Chat controller connected');
        console.log('Outlets defined:', this.constructor.outlets);
        console.log('Initial authentication value from template:', this.isAuthenticatedValue);
        console.log('User email from template:', this.userEmailValue);

        // Initialize Services
        this.notificationService = new NotificationService();
        this.apiService = new ApiService();
        this.authService = new AuthService(this.apiService);
        this.historyService = new HistoryService(this.apiService);
        this.messageService = new MessageService(this.chatWindowMessagesTarget, () => this.modelsValue);
        this.streamingService = new StreamingService();
        this.templateService = new TemplateService(this.apiService);

        // Pass template cache to message service (or update it later)
        this.messageService.setTemplateCache(this.templateService.getTemplateCache());

        // Initialize state
        this.isLoadingValue = true;
        this.authLoadingIndicatorTarget.hidden = false;
        this.loadingIndicatorTarget.style.visibility = 'hidden';
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = true;

        // Initialize Authentication Service
        this.authService.initialize(this.isAuthenticatedValue, this.userEmailValue);
        this.isAuthenticatedValue = this.authService.isAuthenticated; // Sync controller state

        // Listen for API unauthorized events
        document.addEventListener('api:unauthorized', this.handleApiUnauthorized.bind(this));

        // Check if we have the chat-history outlet
        setTimeout(() => {
            console.log('Checking for chat-history outlet after timeout');
            console.log('Has chat-history outlet:', this.hasChatHistoryOutlet);
            if (this.hasChatHistoryOutlet) {
                console.log('Chat history outlet is connected:', this.chatHistoryOutlet);
            }
        }, 1000);

        // Start authentication verification using AuthService
        this.verifyAuthentication(); // Keep this call, but its implementation will change

        // Add a failsafe timeout to hide loading indicators after 5 seconds
        setTimeout(() => {
            if (this.isLoadingValue || this.loadingIndicatorTarget.style.visibility === 'visible' || !this.authLoadingIndicatorTarget.hidden) {
                console.log('Failsafe timeout: forcing loading indicators to hide');
                this.hideAllLoadingIndicators();
            }
        }, 5000);
    }

    // Re-add chatHistoryOutletConnected callback
    chatHistoryOutletConnected(outlet) {
        console.log('CALLBACK: chatHistoryOutletConnected fired.');
        console.log('Chat history outlet connected:', outlet);

        // If history data was loaded before the outlet connected, render it now
        if (this.chatHistoryValue && this.chatHistoryValue.length > 0) {
            console.log('Rendering history from outletConnected callback. History items:', this.chatHistoryValue.length);
            console.log('History data in outlet connected callback:', JSON.stringify(this.chatHistoryValue));
            outlet.renderHistory(this.chatHistoryValue);
        } else {
            console.log('No history data available yet when outlet connected');
        }

        // Force a check for history data
        if (this.isAuthenticatedValue && (!this.chatHistoryValue || this.chatHistoryValue.length === 0)) {
            console.log('No history data yet but authenticated, fetching history now...');
            this.fetchChatHistory().then(history => {
                console.log(`Fetched ${history.length} history items after outlet connected`);
                this.chatHistoryValue = history;
                outlet.renderHistory(this.chatHistoryValue);
            });
        }

        // Dispatch an event to notify the chat-history controller that the outlet is connected
        this.dispatch('outletConnected', { detail: { controller: 'chat' } });
    }

    // Add modelSelectorOutletConnected callback
    modelSelectorOutletConnected(outlet) {
        console.log('CALLBACK: modelSelectorOutletConnected fired.');
        console.log('Model selector outlet connected:', outlet);

        // If models data was loaded before the outlet connected, update the model selector
        if (this.modelsValue && this.modelsValue.length > 0) {
            console.log('Setting models in model selector from outletConnected callback. Models:', this.modelsValue.length);
            outlet.modelsValue = this.modelsValue;
            outlet.render(); // Trigger a render in the model selector
        } else {
            console.log('No models data available yet when outlet connected');

            // Force a fetch of models
            this.fetchModels().then(models => {
                console.log(`Fetched ${models.length} models after outlet connected`);
                this.modelsValue = models;
                outlet.modelsValue = models;
                outlet.render(); // Trigger a render in the model selector
            });
        }
    }

    // --- Private API Setup & Helpers --- // Removed #setupApi - Handled by ApiService

    // Removed #isAuthenticated - handled by AuthService

    // --- Core Controller Logic ---

    // Handle unauthorized event from ApiService
    handleApiUnauthorized({ detail }) {
        console.log('Received api:unauthorized event', detail);
        this.notificationService.showNotification('Session expired or invalid. Please log in again.', 'error', 5000);
        this.handleUnauthenticated(); // Trigger the unauthenticated UI update
    }

    // Public methods for debugging authentication
    checkAuth() {
        console.log('Manual authentication check triggered');
        this.verifyAuthentication();
    }

    // Force show the app regardless of authentication status
    forceShowApp() {
        console.log('Forcing app to show regardless of authentication status');
        this.isAuthenticatedValue = true;
        this.mainAppContainerTarget.hidden = false;
        this.authRequiredMessageTarget.hidden = true;
        this.headerNavTarget.hidden = false;

        // Try to load initial data
        this.loadInitialData();

        this.showNotification('App forced to show. This is a temporary fix.', 'warning', 5000);
    }

    debugToken() {
        console.log('Debugging Symfony session authentication...');

        // For Symfony session auth, we can show the user email from the template
        const userInfo = `User Email: ${this.userEmailValue || 'Not available'}\nAuthenticated: ${this.isAuthenticatedValue}`;
        console.log(userInfo);
        this.showNotification(userInfo, 'info', 5000);

        // Test the session with an API call
        // Removed debugToken() and testSessionWithApi() - Use AuthService methods if needed for debugging
    }


    async verifyAuthentication() {
        console.log('Verifying authentication using AuthService...');
        this.isLoadingValue = true;
        this.authLoadingIndicatorTarget.hidden = false;
        this.loadingIndicatorTarget.style.visibility = 'hidden';

        const dataAttrValue = this.element.dataset.chatIsAuthenticatedValue === 'true';

        try {
            const isAuthenticated = await this.authService.verifyAuthentication(dataAttrValue);
            this.isAuthenticatedValue = isAuthenticated; // Sync controller state

            if (this.isAuthenticatedValue) {
                console.log('AuthService verified: User is authenticated');

                // Update UI for authenticated user
                this.updateAuthenticatedUI();
                await this.loadInitialData(); // Load data only if authenticated
            } else {
                console.log('AuthService verified: User is NOT authenticated');
                this.handleUnauthenticated(); // Update UI for unauthenticated user
            }
        } catch (error) {
            console.error('Error during AuthService verification:', error);
            this.isAuthenticatedValue = false; // Ensure state is false on error
            this.handleUnauthenticated();
        } finally {
            // Reset auth loading state
            console.log('AuthService verification complete, resetting auth loading state');
            this.isLoadingValue = false;
            this.authLoadingIndicatorTarget.hidden = true;

            // Failsafe timeout
            // (Failsafe timeout remains in connect())
        }
    }

    // Updates UI elements for an authenticated user
    updateAuthenticatedUI() {
        if (this.hasUserEmailTarget) {
            this.userEmailTarget.textContent = this.authService.userEmail || 'N/A';
            console.log('Updated user email in header:', this.authService.userEmail);
        }
        if (this.hasHeaderNavTarget) {
            this.headerNavTarget.hidden = false;
            console.log('Header nav is now visible');
        }
        this.mainAppContainerTarget.hidden = false;
        this.authRequiredMessageTarget.hidden = true;
        console.log('Main app container is now visible, auth message hidden');
    }

    // Updates UI elements for an unauthenticated user
    updateUnauthenticatedUI() {
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = false;
        console.log('Main app container hidden, auth required message shown');
        if (this.hasHeaderNavTarget) {
            this.headerNavTarget.hidden = true;
            console.log('Header nav hidden');
        }
        this.hideAllLoadingIndicators(); // Ensure loaders are off
    }

    handleUnauthenticated() {
        console.log('Handling unauthenticated state...');
        this.isAuthenticatedValue = false; // Ensure controller state is false
        this.authService.isAuthenticated = false; // Ensure service state is false
        this.updateUnauthenticatedUI();
        // Optionally show notification (moved from verifyAuthentication error path)
        // this.notificationService.showNotification('Authentication failed or session expired.', 'error');
    }


    async loadInitialData() {
        if (!this.isAuthenticatedValue) return;
        console.log('Loading initial data using services...');
        this.isLoadingValue = true;
        // Keep UI updates minimal here, focus on fetching

        try {
            // Fetch models using ApiService
            this.modelsValue = await this.apiService.getModels();
            console.log(`Loaded ${this.modelsValue.length} models via ApiService`);

            // Fetch chat history using ApiService (only if authenticated)
            if (this.isAuthenticatedValue) {
                this.chatHistoryValue = await this.apiService.getChatHistory();
                console.log(`Loaded ${this.chatHistoryValue.length} history items via ApiService`);

                // Render history if outlet is ready
                this.chatHistoryOutlet?.renderHistory(this.chatHistoryValue);
            } // <-- Added missing closing brace for the inner if block

            this.dispatch('modelsLoaded', { detail: { models: this.modelsValue } });
            console.log('Initial data loaded successfully via services');
        } catch (error) {
            console.error('Error loading initial data via services:', error);
            // ApiService interceptor should handle 401, show generic error for others
            if (error.response?.status !== 401) {
                 this.notificationService.showNotification('Failed to load initial chat data.', 'error');
            }
        } finally {
            // Reset loading state
            console.log('Finished loading initial data, setting loading state to false');
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden'; // Ensure main loader is hidden

            // Failsafe timeout
            // (Failsafe timeout remains in connect())
        }
    }

    // fetchModels - Now delegates to ApiService
    async fetchModels() {
        console.log('Fetching models via ApiService...');
        try {
            const models = await this.apiService.getModels();
            // Service handles dummy data if needed
            return models;
        } catch (error) {
            console.error('Error fetching models via ApiService:', error);
             // ApiService interceptor should handle 401, show generic error for others
            if (error.response?.status !== 401) {
                this.notificationService.showNotification('Failed to fetch models.', 'error');
            }
            return []; // Return empty on error
        }
    }

    // fetchChatHistory - Now delegates to ApiService
    async fetchChatHistory() {
        console.log('Fetching chat history via ApiService...');
        try {
            const history = await this.apiService.getChatHistory();
            return history;
        } catch (error) {
            console.error('Error fetching chat history via ApiService:', error);
            // ApiService interceptor handles 401. Show notification for other errors.
            if (error.response?.status !== 401) {
                this.notificationService.showNotification('Failed to fetch chat history.', 'error');
            }
            return []; // Return empty array on error
        }
    }


    handleModelSelectionChange({ detail: { selectedIds } }) {
        console.log('Selected models changed:', selectedIds);
        this.selectedModelIdsValue = selectedIds;
        this.dispatch('modelSelectionUpdated', { detail: { selectedIds: this.selectedModelIdsValue } });
    }

    // Handle template selection from template-selector controller
    templateSelected({ detail: { templateId, associatedModelId } }) {
        console.log('Template selected:', templateId, 'with model:', associatedModelId);
        this.selectedTemplateIdValue = templateId || 0;

        // Store the associated model ID for later use if models aren't loaded yet
        this._pendingAssociatedModelId = associatedModelId;

        // If the template has an associated model, select it
        if (associatedModelId) {
            // Check if models are loaded
            if (!this.modelsValue || this.modelsValue.length === 0) {
                console.log('Models not loaded yet, fetching models first...');
                // Fetch models first, then try to select the model
                this.fetchModels().then(models => {
                    console.log(`Fetched ${models.length} models after template selection`);
                    this.modelsValue = models;
                    // Now try to select the model
                    this._selectAssociatedModel(associatedModelId);
                });
                return;
            }

            // Models are loaded, try to select the model
            this._selectAssociatedModel(associatedModelId);
        }
    }

    // Helper method to select the associated model
    _selectAssociatedModel(associatedModelId) {
        // Debug: Log all available models with detailed information
        console.log('Available models:', this.modelsValue.map(m => ({
            id: m.id,
            modelId: m.modelId,
            name: m.name,
            modelIdType: typeof m.modelId,
            modelIdLength: m.modelId ? m.modelId.length : 0
        })));
        console.log('Looking for model ID:', associatedModelId, 'type:', typeof associatedModelId, 'length:', associatedModelId ? associatedModelId.length : 0);

        // Try to find the exact match first - with detailed logging
        let model = null;
        for (const m of this.modelsValue) {
            console.log(`Comparing: '${m.modelId}' === '${associatedModelId}'`, m.modelId === associatedModelId);
            if (m.modelId === associatedModelId) {
                model = m;
                break;
            }
        }

        // If no exact match, try a more flexible match (e.g., for version differences)
        if (!model) {
            try {
                // Try a more flexible approach - normalize both strings for comparison
                console.log('Trying more flexible matching approaches...');

                // Approach 1: Extract the base model name without version
                if (associatedModelId && associatedModelId.includes('-')) {
                    const baseModelId = associatedModelId.split('-').slice(0, -1).join('-');
                    console.log('Trying to match with base model ID:', baseModelId);

                    // Try to find a model that starts with the base model ID
                    if (baseModelId) {
                        for (const m of this.modelsValue) {
                            if (m.modelId && m.modelId.startsWith(baseModelId)) {
                                console.log(`Found match with base model ID: '${m.modelId}' starts with '${baseModelId}'`);
                                model = m;
                                break;
                            }
                        }
                    }
                }

                // Approach 2: Remove all version numbers and compare
                if (!model && associatedModelId) {
                    // Remove all version numbers (like 3, 3.7, etc.)
                    const normalizedSearchId = associatedModelId.replace(/[\d.]+/g, '');
                    console.log('Normalized search ID (no versions):', normalizedSearchId);

                    for (const m of this.modelsValue) {
                        if (!m.modelId) continue;

                        const normalizedModelId = m.modelId.replace(/[\d.]+/g, '');
                        console.log(`Comparing normalized: '${normalizedModelId}' vs '${normalizedSearchId}'`);

                        // Check if they're similar enough
                        if (normalizedModelId === normalizedSearchId ||
                            normalizedModelId.includes(normalizedSearchId) ||
                            normalizedSearchId.includes(normalizedModelId)) {
                            console.log(`Found match with normalized IDs: '${m.modelId}' matches '${associatedModelId}'`);
                            model = m;
                            break;
                        }
                    }
                }

                // Approach 3: Just look for a model with the same provider and similar name
                if (!model && associatedModelId && associatedModelId.includes('/')) {
                    const [provider, modelName] = associatedModelId.split('/');
                    console.log(`Looking for any model from provider: '${provider}'`);

                    for (const m of this.modelsValue) {
                        if (m.modelId && m.modelId.startsWith(provider + '/')) {
                            console.log(`Found model from same provider: '${m.modelId}'`);
                            model = m;
                            break;
                        }
                    }
                }

                if (model) {
                    console.log('Found similar model:', model.modelId);
                } else {
                    console.log('No matching model found after all attempts');
                }
            } catch (error) {
                console.error('Error while trying to match model:', error);
            }
        }

        if (model) {
            console.log('Selecting associated model:', model.name);
            // Set the selected model
            this.selectedModelIdsValue = [model.id]; // Use model.id (database ID)
            // Notify the model selector about the change
            // Create and dispatch a custom event that the model-selector is listening for
            // Ensure we dispatch the database ID (model.id) consistent with selectedModelIdsValue
            const event = new CustomEvent('chat:setSelectedModels', {
                bubbles: true,
                detail: { selectedIds: [model.id] } // Use model.id
            });
            document.dispatchEvent(event);
        } else {
            console.warn('Associated model not found in available models:', associatedModelId);
        }
    }


    async handleSendMessage({ detail: { prompt } }) {
        // Check if prompt is empty, no models selected, or already loading
        if (!prompt.trim()) {
            console.warn('Cannot send empty message');
            return;
        }

        if (this.selectedModelIdsValue.length === 0) {
            console.warn('Cannot send message: No models selected');
            // Show a notification to the user
            this.showNotification('Please select at least one model before sending a message');
            return;
        }

        if (this.isLoadingValue) {
            console.warn('Cannot send message: Already processing a request');
            return;
        }

        console.log('Sending message:', prompt, 'to models:', this.selectedModelIdsValue, 'thread:', this.currentThreadIdValue, 'template:', this.selectedTemplateIdValue);
        this.isLoadingValue = true;
        this.loadingIndicatorTarget.style.visibility = 'visible';
        this.dispatch('sendStart');

        // Include templateId in the user message if a template is selected
        const templateId = this.selectedTemplateIdValue || undefined;
        let templateName = undefined;

        // Get template name if a template is used
        if (templateId) {
            // Try to get template info from the template-selector outlet or cache
            const templateInfo = this.getTemplateInfo(templateId);
            if (templateInfo) {
                templateName = templateInfo.name;
            }
        }

        const userMessage = {
            role: 'user',
            content: prompt,
            id: `msg_${Date.now()}`,
            threadId: this.currentThreadIdValue || null,
            templateId: templateId,
            templateName: templateName
        };
        // Use MessageService to create user message object and append
        const userMessageObject = this.messageService.createUserMessage(prompt, this.currentThreadIdValue, templateId, templateName);
        this.messageService.appendMessageToDOM(userMessageObject);
        this.currentMessagesValue = [...this.currentMessagesValue, userMessageObject];

        const promptId = userMessageObject.promptId || `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // Use promptId from user message if available

        // Use MessageService to create placeholders and append
        const modelPlaceholders = this.messageService.createModelPlaceholders(this.selectedModelIdsValue, this.currentThreadIdValue, promptId);
        modelPlaceholders.forEach(placeholder => this.messageService.appendMessageToDOM(placeholder));
        this.currentMessagesValue = [...this.currentMessagesValue, ...modelPlaceholders];

        // Determine which models support streaming
        const modelsData = this.modelsValue || [];
        const selectedModels = modelsData.filter(m => this.selectedModelIdsValue.includes(m.id));
        const streamingModels = selectedModels.filter(m => m.supportsStreaming);

        // We'll use streaming for any model that supports it
        const hasStreamingModels = streamingModels.length > 0;

        try {
            // Handle streaming and non-streaming models separately
            if (hasStreamingModels) {
                console.log('Setting up streaming responses for supported models');

                // Track thread ID from first response
                let threadIdFromResponse = null;

                // Create an array to track active streaming requests
                const streamingRequests = [];

                // Process streaming models first
                for (const model of streamingModels) {
                    console.log(`Setting up streaming for model: ${model.name} (${model.id})`);

                    const streamParams = {
                        userInput: prompt,
                        models: [model.id],
                        promptId: promptId,
                        threadId: this.currentThreadIdValue || threadIdFromResponse || undefined,
                        templateId: this.selectedTemplateIdValue || undefined,
                    };

                    const streamingRequest = this.streamingService.sendStreamingRequest(
                        streamParams,
                        // onChunk callback
                        (streamContent) => {
                            this.messageService.updateStreamingContent(promptId, model.id, streamContent);
                        },
                        // onThreadId callback
                        (threadId) => {
                            if (!this.currentThreadIdValue) {
                                // Save thread ID from first response
                                threadIdFromResponse = threadId;
                                this.currentThreadIdValue = threadId;
                                console.log('New thread created from streaming response:', this.currentThreadIdValue);
                                // Update state for existing messages
                                this.currentMessagesValue = this.currentMessagesValue.map(msg => ({ ...msg, threadId: msg.threadId || this.currentThreadIdValue }));
                            }
                        },
                        // onComplete callback
                        (finalContent) => {
                            console.log(`Streaming complete for model ${model.name}`);
                            this.messageService.updatePlaceholderMessage(promptId, model.id, finalContent);

                            // Update final state for the streamed message
                            const messageIndex = this.currentMessagesValue.findIndex(msg =>
                                msg.promptId === promptId && msg.modelId === model.id && msg.role === 'assistant');
                            if (messageIndex !== -1) {
                                const updatedMessages = [...this.currentMessagesValue];
                                updatedMessages[messageIndex] = {
                                    ...updatedMessages[messageIndex],
                                    content: finalContent,
                                    isPlaceholder: false
                                };
                                this.currentMessagesValue = updatedMessages;
                            }

                            // Remove this request from active requests
                            const index = streamingRequests.findIndex(req => req.modelId === model.id);
                            if (index !== -1) {
                                streamingRequests.splice(index, 1);
                            }

                            // If all streaming requests are done, mark as complete
                            if (streamingRequests.length === 0) {
                                this.isLoadingValue = false;
                                this.dispatch('sendEnd');
                            }
                        },
                        // onError callback
                        (error, streamContent) => {
                            console.error(`Streaming error for model ${model.name}:`, error);

                            if (streamContent) {
                                this.messageService.updatePlaceholderMessage(promptId, model.id, streamContent);
                            } else {
                                // Only remove this model's placeholder, not all
                                this.messageService.removePlaceholderForModel(promptId, model.id);

                                // Update the state
                                const messageIndex = this.currentMessagesValue.findIndex(msg =>
                                    msg.promptId === promptId && msg.modelId === model.id && msg.role === 'assistant');
                                if (messageIndex !== -1) {
                                    const updatedMessages = [...this.currentMessagesValue];
                                    updatedMessages.splice(messageIndex, 1);
                                    this.currentMessagesValue = updatedMessages;
                                }
                            }

                            // Remove this request from active requests
                            const index = streamingRequests.findIndex(req => req.modelId === model.id);
                            if (index !== -1) {
                                streamingRequests.splice(index, 1);
                            }

                            // If all streaming requests are done, mark as complete
                            if (streamingRequests.length === 0) {
                                this.isLoadingValue = false;
                                this.dispatch('sendEnd');
                            }

                            this.notificationService.showNotification(`Error with ${model.name}: ${error.message}`, 'error');
                        }
                    );

                    // Add to active requests
                    streamingRequests.push({
                        modelId: model.id,
                        controller: streamingRequest,
                    });
                }

                // Process non-streaming models if there are any
                const nonStreamingModels = selectedModels.filter(m => !m.supportsStreaming);
                if (nonStreamingModels.length > 0) {
                    const nonStreamingModelIds = nonStreamingModels.map(m => m.id);
                    console.log(`Processing non-streaming models: ${nonStreamingModelIds.join(', ')}`);

                    try {
                        // Wait for thread ID from streaming response if needed
                        setTimeout(async () => {
                            const response = await this.apiService.sendChatMessage({
                                userInput: prompt,
                                models: nonStreamingModelIds,
                                threadId: this.currentThreadIdValue || undefined,
                                promptId,
                                templateId: this.selectedTemplateIdValue || undefined,
                                stream: false
                            });

                            console.log('Non-streaming API Response Data:', response);

                            // Process non-streaming responses
                            if (response && response.responses) {
                                Object.entries(response.responses).forEach(([modelId, responseData]) => {
                                    // Update placeholder with final content
                                    this.messageService.updatePlaceholderMessage(
                                        promptId,
                                        modelId,
                                        responseData.content,
                                        responseData.usage
                                    );
                                });
                            }

                            // If no streaming requests are active, mark as complete
                            if (streamingRequests.length === 0) {
                                this.isLoadingValue = false;
                                this.dispatch('sendEnd');
                            }
                        }, threadIdFromResponse ? 0 : 500); // Small delay if waiting for thread ID
                    } catch (apiError) {
                        console.error('Error with non-streaming models:', apiError);
                        this.notificationService.showNotification(`Error with non-streaming models: ${apiError.message}`, 'error');

                        // If no streaming requests are active, mark as complete
                        if (streamingRequests.length === 0) {
                            this.isLoadingValue = false;
                            this.dispatch('sendEnd');
                        }
                    }
                }
            } else {
                 // For non-streaming, use ApiService (when no models support streaming)
                let response = null; // Initialize response
                try {
                    response = await this.apiService.sendChatMessage({
                        userInput: prompt,
                        models: this.selectedModelIdsValue,
                        threadId: this.currentThreadIdValue || undefined,
                        promptId,
                        templateId: this.selectedTemplateIdValue || undefined,
                        stream: false
                    });
                } catch (apiError) {
                    // Catch errors specifically from sendChatMessage
                    console.error('Error caught from apiService.sendChatMessage:', apiError);
                    // Re-throw to be handled by the outer catch block
                    throw apiError;
                }

                // The 'response' variable here IS the data returned by apiService.sendChatMessage
                console.log('API Response Data:', response);

                // Check if response is valid before accessing properties
                if (response) {
                    // Update thread ID if it's a new thread
                    if (!this.currentThreadIdValue && response.threadId) { // Access threadId directly
                        this.currentThreadIdValue = response.threadId;
                        console.log('New thread created:', this.currentThreadIdValue);
                        this.currentMessagesValue = this.currentMessagesValue.map(msg => ({ ...msg, threadId: msg.threadId || this.currentThreadIdValue }));
                    }

                    // Handle non-streaming response (update placeholders via MessageService)
                    if (response.responses) { // Access responses directly
                        Object.entries(response.responses).forEach(([modelId, data]) => {
                             // Add checks for data and data.content
                            if (data && data.content) {
                                this.messageService.updatePlaceholderMessage(promptId, modelId, data.content, data.usage);
                            } else {
                                console.warn(`Missing content for model ${modelId} in non-streaming response.`);
                                this.messageService.updatePlaceholderMessage(promptId, modelId, '[Error: No content received]', null);
                            }
                        });
                    } else {
                        console.warn('No "responses" key found in non-streaming API response data:', response);
                        // Remove placeholders as we don't know which succeeded
                        this.messageService.removePlaceholders(promptId);
                        const errorMsg = { role: 'system', content: 'Error: Invalid response format received.', id: `error_format_${Date.now()}`, threadId: this.currentThreadIdValue || null };
                        this.messageService.appendMessageToDOM(errorMsg);
                        this.currentMessagesValue = [...this.currentMessagesValue, errorMsg];
                    }
                } else {
                    // Handle case where response is null/undefined without an error
                    console.error('API call returned undefined/null without throwing an error.');
                    this.messageService.removePlaceholders(promptId);
                    const errorMsg = { role: 'system', content: 'Error: Empty response received.', id: `error_empty_${Date.now()}`, threadId: this.currentThreadIdValue || null };
                    this.messageService.appendMessageToDOM(errorMsg);
                    this.currentMessagesValue = [...this.currentMessagesValue, errorMsg];
                }
            }
        // Outer catch block handles errors thrown from streaming or non-streaming paths
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove placeholders via MessageService
            this.messageService.removePlaceholders(promptId);
            // Create and append error message via MessageService
            const errorMessage = { role: 'system', content: `Error: Failed to get response. ${error.message || ''}`, id: `error_${Date.now()}`, threadId: this.currentThreadIdValue || null };
            this.messageService.appendMessageToDOM(errorMessage);
            this.currentMessagesValue = [...this.currentMessagesValue, errorMessage];
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden';
            this.dispatch('sendEnd');
        }
    }

    // updateStreamingContent - Delegate to MessageService
    updateStreamingContent(promptId, modelId, content) {
        this.messageService.updateStreamingContent(promptId, modelId, content);
        // Update state (remains in controller)
        const messageIndex = this.currentMessagesValue.findIndex(msg =>
            msg.promptId === promptId && msg.modelId === modelId && msg.role === 'assistant');
        if (messageIndex !== -1) {
            const updatedMessages = [...this.currentMessagesValue];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: content,
                isPlaceholder: false // Mark as no longer placeholder during streaming
            };
            this.currentMessagesValue = updatedMessages;
        }
    }

    // updatePlaceholderMessage - Delegate to MessageService
    updatePlaceholderMessage(promptId, modelId, finalContent, usage) {
        this.messageService.updatePlaceholderMessage(promptId, modelId, finalContent, usage);
        // Update state (remains in controller)
        const messageIndex = this.currentMessagesValue.findIndex(msg => msg.promptId === promptId && msg.modelId === modelId && msg.role === 'assistant');
        if (messageIndex !== -1) {
            const updatedMessages = [...this.currentMessagesValue];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: finalContent,
                usage: usage,
                isPlaceholder: false
            };
            this.currentMessagesValue = updatedMessages;
        } else {
             // If placeholder wasn't found in state (edge case), add the final message
             console.warn(`Could not find placeholder message in state for model ${modelId} and prompt ${promptId} to update.`);
             const finalMessage = {
                 role: 'assistant', content: finalContent, modelId,
                 id: `msg_${Date.now()}_${modelId}_final`, threadId: this.currentThreadIdValue || null,
                 promptId, usage: usage
             };
             // Don't append to DOM here, messageService already did
             this.currentMessagesValue = [...this.currentMessagesValue, finalMessage];
        }
    }

    // removePlaceholders - Delegate to MessageService
    removePlaceholders(promptId) {
        this.messageService.removePlaceholders(promptId);
        // Update state (remains in controller)
        this.currentMessagesValue = this.currentMessagesValue.filter(msg => !(msg.promptId === promptId && msg.role === 'assistant' && msg.isPlaceholder));
    }


    async handleSelectChat({ detail: { threadId } }) {
        console.log('Selecting chat thread:', threadId);
        if (this.currentThreadIdValue === threadId) return;

        this.isLoadingValue = true;
        this.messageService.clearChatWindow(); // Use service

        try {
            // Use ApiService to get thread data
            const historyData = await this.apiService.getThread(threadId);
            if (!historyData) {
                throw new Error('Failed to fetch thread data.');
            }

            this.currentThreadIdValue = threadId;
            // Use HistoryService to flatten messages
            this.currentMessagesValue = this.historyService.flattenHistory(historyData.messages || [], threadId);

            // Use TemplateService to preload template info
            await this.templateService.preloadTemplateInfo(this.currentMessagesValue);
            // Update message service cache
            this.messageService.setTemplateCache(this.templateService.getTemplateCache());

            // Use MessageService to render messages
            this.messageService.clearChatWindow(); // Clear again just in case

            // Use HistoryService to group messages for ordered rendering
            const messagesByPrompt = this.historyService.groupMessagesByPrompt(this.currentMessagesValue);

            Object.values(messagesByPrompt).forEach(messages => {
                messages.filter(msg => msg.role === 'user').forEach(msg => this.messageService.appendMessageToDOM(msg));
                messages.filter(msg => msg.role === 'assistant').forEach(msg => this.messageService.appendMessageToDOM(msg));
            });

            // Remove empty containers (could be moved to MessageService potentially)
            document.querySelectorAll('.assistant-responses-container:empty').forEach(container => {
                console.log('Removing empty assistant responses container');
                container.remove();
            });

            // Use HistoryService to get unique model IDs
            const modelIdsInThread = this.historyService.getUniqueModelIds(this.currentMessagesValue);
            console.log('Unique model IDs in thread (via HistoryService):', modelIdsInThread);

            if (modelIdsInThread.length > 0) {
                this.selectedModelIdsValue = modelIdsInThread; // Update state

                // Dispatch event to update model selector
                console.log('Dispatching chat:setSelectedModels event with selectedIds:', modelIdsInThread);
                // Use a consistent global event name
                const event = new CustomEvent('chat:setSelectedModels', { detail: { selectedIds: modelIdsInThread }, bubbles: true });
                document.dispatchEvent(event);

                // Get model names for notification
                const modelNames = (this.modelsValue || [])
                    .filter(model => modelIdsInThread.includes(model.id)) // Use model.id here
                    .map(model => model.name)
                    .join(', ');

                if (modelNames) {
                    // Use NotificationService
                    this.notificationService.showNotification(`Selected models: ${modelNames}`, 'info');
                }
            }

            console.log('Chat loaded:', threadId, 'Messages:', this.currentMessagesValue.length);
        } catch (error) {
            console.error('Error loading thread history:', error);
            // Use NotificationService
            this.notificationService.showNotification(`Error: Failed to load chat history. ${error.message || ''}`, 'error');
            this.currentThreadIdValue = null;
            this.currentMessagesValue = []; // Clear messages on error
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden';
            this.messageService.scrollToBottom(); // Use service
        }
    }

    // #flattenHistory - Removed, now in HistoryService


    async handleStartNewChat() {
        console.log('Starting new chat...');
        this.isLoadingValue = true;

        try {
            // Use ApiService to create thread
            const { threadId } = await this.apiService.createThread();
            console.log('New thread created via ApiService:', threadId);

            // Update state
            this.currentThreadIdValue = threadId;
            this.currentMessagesValue = [];
            this.selectedModelIdsValue = [];
            this.selectedTemplateIdValue = 0;

            // Update UI via MessageService and dispatch events
            this.messageService.clearChatWindow();
            this.dispatch('chat:setSelectedModels', { detail: { selectedIds: [] }, bubbles: true }); // Use consistent event name
            this.dispatch('clearTemplate'); // Notify template selector

            // Refresh chat history list via ApiService
            if (this.isAuthenticatedValue) {
                this.chatHistoryValue = await this.apiService.getChatHistory();
                this.chatHistoryOutlet?.renderHistory(this.chatHistoryValue);
            }
        } catch (error) {
            console.error('Error starting new chat via ApiService:', error);
            // Use NotificationService
            this.notificationService.showNotification(`Error: Failed to start new chat. ${error.message || ''}`, 'error');
        } finally {
             this.isLoadingValue = false;
             this.loadingIndicatorTarget.style.visibility = 'hidden';
        }
    }

    // --- UI Helpers ---

    // Toggle chat history sidebar for mobile layout
    toggleChatHistory() {
        if (this.hasChatHistorySidebarTarget && this.hasSidebarOverlayTarget) {
            const sidebar = this.chatHistorySidebarTarget;
            const overlay = this.sidebarOverlayTarget;

            // Check if sidebar is currently visible
            const isVisible = !sidebar.classList.contains('hidden');

            if (isVisible) {
                // Hide sidebar
                sidebar.classList.add('hidden');
                sidebar.classList.add('translate-x-full');
                overlay.classList.add('hidden');
            } else {
                // Show sidebar
                sidebar.classList.remove('hidden');
                sidebar.classList.remove('translate-x-full');
                overlay.classList.remove('hidden');
            }
        }
    }

    // Toggle mobile menu in header
    toggleMobileMenu() {
        if (this.hasMobileMenuTarget) {
            this.mobileMenuTarget.classList.toggle('hidden');
        }
    }

    // clearChatWindow - Removed, delegated to MessageService

    // copyAsMarkdown - Keep for now, but could move to a dedicated UI interaction service
    copyAsMarkdown(event) {
        const button = event.currentTarget;
        const originalContent = button.dataset.originalContent;

        if (originalContent) {
            navigator.clipboard.writeText(originalContent)
                .then(() => {
                    this.showCopyFeedback(button, 'Markdown zkopírován!');
                })
                .catch(err => {
                    console.error('Nepodařilo se zkopírovat text: ', err);
                    // Use NotificationService
                    this.notificationService.showNotification('Nepodařilo se zkopírovat text', 'error');
                });
        }
    }

    // copyAsHtml - Keep for now, but could move to a dedicated UI interaction service
    copyAsHtml(event) {
        const button = event.currentTarget;
        const messageElement = button.closest('.message--assistant');
        const contentElement = messageElement.querySelector('[data-role="content"]');

        if (contentElement) {
            const htmlContent = contentElement.innerHTML;
            navigator.clipboard.writeText(htmlContent)
                .then(() => {
                    this.showCopyFeedback(button, 'HTML zkopírován!');
                })
                .catch(err => {
                    console.error('Nepodařilo se zkopírovat HTML: ', err);
                     // Use NotificationService
                    this.notificationService.showNotification('Nepodařilo se zkopírovat HTML', 'error');
                });
        }
    }

    // showCopyFeedback - Keep for now, related to copy actions
    showCopyFeedback(button, message) {
        const originalText = button.textContent;
        button.textContent = message;
        button.classList.add('bg-green-200');

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-200');
        }, 2000);
    }

    // showNotification - Removed, delegated to NotificationService

    // hideAllLoadingIndicators - Keep as it manipulates controller targets
    hideAllLoadingIndicators() {
        console.log('Force hiding all loading indicators');
        this.isLoadingValue = false;

        if (this.hasLoadingIndicatorTarget) {
            this.loadingIndicatorTarget.style.visibility = 'hidden';
        }

        if (this.hasAuthLoadingIndicatorTarget) {
            this.authLoadingIndicatorTarget.hidden = true;
        }
    }

    // logout - Delegate to AuthService
    logout() {
        console.log('Logging out via AuthService...');
        // Use NotificationService
        this.notificationService.showNotification('Logging out...', 'info');
        this.authService.logout();
    }

    // appendMessageToDOM - Removed, delegated to MessageService

    // scrollToBottom - Removed, delegated to MessageService

    // --- Logout --- // Duplicate section removed

    disconnect() {
        console.log('Chat controller disconnected');
        // Cleanup? Remove EventSource listener if implemented.
    }

    // Helper method to get template information by ID
    getTemplateInfo(templateId) {
        // If templateId is undefined or null, return null
        if (!templateId) {
            return null;
        }

        // If we have a template-selector outlet, try to get the template from there
        if (this.hasTemplateSelectorOutlet && this.templateSelectorOutlet.templatesValue) {
            const template = this.templateSelectorOutlet.templatesValue.find(t => t.id === parseInt(templateId, 10));
            if (template) {
                return template;
            }
        }

        // Use TemplateService to get info (it handles caching)
        // Note: This is now async, which might require adjustments where it's called
        // For simplicity in this refactor, we'll keep the sync assumption for now,
        // relying on the preload in handleSelectChat. A deeper refactor might make
        // message rendering async or pass the cache differently.
        const cachedTemplate = this.templateService.getTemplateCache()[templateId];
        if (cachedTemplate) {
            return cachedTemplate;
        }

        // If not preloaded, return a placeholder and let the service fetch
        console.warn(`Template ${templateId} not preloaded, fetching on demand (may cause UI flicker)`);
        this.templateService.getTemplateInfo(templateId).then(template => {
             // Update message service cache and potentially re-render relevant messages if needed
             this.messageService.updateTemplateCache(templateId, template);
             // TODO: Potentially trigger re-render of messages using this template if needed
        });
        return { name: `Načítání šablony ${templateId}...` }; // Return placeholder immediately
    }

    // fetchTemplateInfo - Removed, now handled by TemplateService.getTemplateInfo

    // preloadTemplateInfo - Delegate to TemplateService
    async preloadTemplateInfo(messages) {
        await this.templateService.preloadTemplateInfo(messages);
        // Update message service's cache reference after preloading
        this.messageService.setTemplateCache(this.templateService.getTemplateCache());
    }
}
