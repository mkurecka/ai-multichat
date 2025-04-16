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
        "templateSelectorContainer",
        "chatHistoryContainer",
        "chatWindowMessages",
        "chatInputContainer",
        "loadingIndicator",
        "authLoadingIndicator",
        "authRequiredMessage",
        "mainAppContainer",
        "headerNav",
        "userEmail"
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

    static outlets = ['chat-history', 'template-selector']; // This should match the data-chat-history-outlet and data-template-selector-outlet attributes in the HTML

    api = null; // To hold the configured Axios instance
    isRefreshingToken = false; // Flag to prevent multiple refresh attempts

    connect() {
        console.log('Chat controller connected');
        console.log('Outlets defined:', this.constructor.outlets);
        console.log('Initial authentication value from template:', this.isAuthenticatedValue);
        console.log('User email from template:', this.userEmailValue);

        // Initialize state
        // Note: We don't set isAuthenticatedValue here because it's already set from the template
        // this.isAuthenticatedValue = false;
        this.isLoadingValue = true;
        this.authLoadingIndicatorTarget.hidden = false;
        this.loadingIndicatorTarget.style.visibility = 'hidden'; // Make sure loading indicator starts hidden
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = true;

        // Setup API with interceptors
        this.#setupApi();

        // Debug: Force authentication to true if it's set in the template
        if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticatedValue = true;
        }

        // Check if we have the chat-history outlet
        setTimeout(() => {
            console.log('Checking for chat-history outlet after timeout');
            console.log('Has chat-history outlet:', this.hasChatHistoryOutlet);
            if (this.hasChatHistoryOutlet) {
                console.log('Chat history outlet is connected:', this.chatHistoryOutlet);
            }
        }, 1000);

        // Start authentication verification
        this.verifyAuthentication();

        // Add a failsafe timeout to hide loading indicators after 5 seconds
        // This ensures they don't stay visible indefinitely if something goes wrong
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

    // --- Private API Setup & Helpers ---

    #setupApi() {
        this.api = axios.create({
            baseURL: '/api',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest' // Add this for Symfony to recognize AJAX requests
            },
            // Important: Include credentials for Symfony session cookies
            withCredentials: true
        });

        // Response interceptor (handle 401)
        this.api.interceptors.response.use(
            (response) => response,
            async (error) => {
                // Handle 401 Unauthorized errors
                if (error.response?.status === 401) {
                    console.log('Received 401 Unauthorized response');
                    console.log('Error details:', error.response?.data);

                    // Check if the template says we're authenticated
                    if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
                        console.log('Template says user is authenticated, but API returned 401');
                        this.showNotification('Session authentication issue detected. Attempting to refresh...', 'warning', 5000);

                        // Try to verify authentication again
                        try {
                            await this.verifyAuthentication();
                            if (this.isAuthenticatedValue) {
                                this.showNotification('Authentication refreshed successfully!', 'success', 3000);
                                // If the original request was a GET, we could retry it here
                                if (error.config.method.toLowerCase() === 'get') {
                                    console.log('Retrying GET request after authentication refresh');
                                    return this.api.request(error.config);
                                }
                            } else {
                                this.handleUnauthenticated();
                            }
                        } catch (verifyError) {
                            console.error('Failed to verify authentication:', verifyError);
                            this.handleUnauthenticated();
                        }
                    } else {
                        // For Symfony session auth, show the auth required message
                        this.handleUnauthenticated();
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    #isAuthenticated() {
        // For Symfony session auth, we rely on the isAuthenticatedValue that's set from the template
        // This value comes directly from Symfony's security system
        console.log('Checking authentication status from Symfony:', this.isAuthenticatedValue);

        // Also check the data attribute directly from the element
        const dataAttrValue = this.element.dataset.chatIsAuthenticatedValue === 'true';
        console.log('Data attribute authentication value:', dataAttrValue);

        // If either is true, consider the user authenticated
        const isAuth = this.isAuthenticatedValue || dataAttrValue;
        console.log('Final authentication decision:', isAuth);

        // Update the controller value to match
        if (isAuth) {
            this.isAuthenticatedValue = true;
        }

        return isAuth;
    }

    // --- Core Controller Logic ---

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
        this.testSessionWithApi();
    }

    async testSessionWithApi() {
        console.log('Testing Symfony session with API call...');

        // Force authentication to true if it's set in the template
        if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticatedValue = true;
        }

        // Show current authentication state
        const authState = `Current authentication state:\n` +
            `- Controller value: ${this.isAuthenticatedValue}\n` +
            `- Template data attribute: ${this.element.dataset.chatIsAuthenticatedValue}\n` +
            `- User email: ${this.userEmailValue || 'Not available'}`;

        console.log(authState);
        this.showNotification(authState, 'info', 5000);

        try {
            // Make a simple API call to test the session
            const response = await this.api.get('/models');
            console.log('API test response:', response);
            this.showNotification('API call successful! Symfony session is working.', 'success');

            // If the API call was successful, try to verify authentication again
            this.verifyAuthentication();

            // Force show the main app container
            this.mainAppContainerTarget.hidden = false;
            this.authRequiredMessageTarget.hidden = true;
            console.log('Forced main app container to be visible');
        } catch (error) {
            console.error('API test failed:', error);
            let errorMessage = 'API call failed. Symfony session may be invalid.';

            if (axios.isAxiosError(error)) {
                errorMessage += `\nStatus: ${error.response?.status || 'unknown'}`;
                errorMessage += `\nMessage: ${error.response?.data?.message || error.message || 'No details'}`;

                // If we got a 401, the session is likely invalid
                if (error.response?.status === 401) {
                    errorMessage += '\n\nYour session appears to be invalid. Please try logging in again.';
                }
            }

            this.showNotification(errorMessage, 'error', 8000);
        }
    }

    async verifyAuthentication() {
        console.log('Verifying authentication...');
        console.log('Current authentication value:', this.isAuthenticatedValue);
        console.log('Template data attribute:', this.element.dataset.chatIsAuthenticatedValue);

        // Make sure auth loading indicator is visible during verification
        // but keep the main loading indicator hidden
        this.isLoadingValue = true;
        this.authLoadingIndicatorTarget.hidden = false;
        this.loadingIndicatorTarget.style.visibility = 'hidden'; // Always keep main loader hidden during auth

        // Force authentication to true if it's set in the template
        if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticatedValue = true;
        }

        try {
            // Make a test API call to verify the session is working
            try {
                console.log('Making test API call to verify session...');
                const response = await this.api.get('/models');
                console.log('Test API call successful:', response.data);

                // If we get here, the session is working
                this.isAuthenticatedValue = true;
                console.log('Session verified via API call');
            } catch (apiError) {
                console.error('Test API call failed:', apiError);

                // If the template says we're authenticated but the API call fails,
                // we might have a session issue
                if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
                    console.warn('Template says authenticated but API call failed - possible session issue');
                    // We'll still try to proceed with the template's authentication value
                } else {
                    // If the template doesn't say we're authenticated and the API call fails,
                    // we're definitely not authenticated
                    this.isAuthenticatedValue = false;
                }
            }

            console.log('Authentication value after verification:', this.isAuthenticatedValue);

            // For Symfony session auth, we already have the authentication status from the template
            if (this.isAuthenticatedValue) {
                console.log('User is authenticated via Symfony session');

                // Update the user email display in the header
                if (this.hasUserEmailTarget) {
                    this.userEmailTarget.textContent = this.userEmailValue;
                    console.log('Updated user email in header:', this.userEmailValue);
                } else {
                    console.warn('User email target not found');
                }

                // Show the header
                if (this.hasHeaderNavTarget) {
                    this.headerNavTarget.hidden = false;
                    console.log('Header nav is now visible');
                } else {
                    console.warn('Header nav target not found');
                }

                // Show the main app container and hide auth message
                this.mainAppContainerTarget.hidden = false;
                this.authRequiredMessageTarget.hidden = true;
                console.log('Main app container is now visible, auth message hidden');

                // Load initial data (which manages its own loading state)
                console.log('Loading initial data...');
                await this.loadInitialData();
            } else {
                console.log('User is not authenticated according to verification');
                this.handleUnauthenticated();
            }
        } catch (error) {
            console.error('Error during authentication verification:', error);
            this.handleUnauthenticated();
        } finally {
            // Always reset auth loading state
            console.log('Authentication verification complete, resetting auth loading state');
            this.isLoadingValue = false;
            this.authLoadingIndicatorTarget.hidden = true;

            // Force the loading indicator to be hidden with a timeout as a fallback
            setTimeout(() => {
                if (this.isLoadingValue || this.loadingIndicatorTarget.style.visibility === 'visible') {
                    console.log('Forcing loading indicators to hide via timeout');
                    this.loadingIndicatorTarget.style.visibility = 'hidden';
                    this.authLoadingIndicatorTarget.hidden = true;
                    this.isLoadingValue = false;
                }
            }, 1000);
        }
    }

    handleUnauthenticated() {
        console.log('User is not authenticated, handling unauthenticated state');

        // Check if the template says we're authenticated
        if (this.element.dataset.chatIsAuthenticatedValue === 'true') {
            console.log('Template says user is authenticated, but controller thinks not');
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticatedValue = true;

            // Try to verify authentication again
            this.verifyAuthentication();
            return;
        }

        this.isAuthenticatedValue = false;

        // Update UI
        console.log('Updating UI for unauthenticated state');
        this.mainAppContainerTarget.hidden = true;
        this.authRequiredMessageTarget.hidden = false;
        console.log('Main app container hidden, auth required message shown');

        // Hide the header
        if (this.hasHeaderNavTarget) {
            this.headerNavTarget.hidden = true;
            console.log('Header nav hidden');
        } else {
            console.warn('Header nav target not found');
        }

        // Make sure loading indicators are hidden
        this.isLoadingValue = false;
        this.loadingIndicatorTarget.style.visibility = 'hidden';
        this.authLoadingIndicatorTarget.hidden = true;
        console.log('All loading indicators hidden');

        // Show a notification instead of redirecting
        this.showNotification('Authentication issue detected. Use the buttons below to debug or force show the app.', 'warning', 5000);
    }

    async loadInitialData() {
        if (!this.isAuthenticatedValue) return;
        console.log('Loading initial data...');
        this.mainAppContainerTarget.hidden = false;
        this.authRequiredMessageTarget.hidden = true;

        // Set loading state for initial data load (but don't show the main loading indicator)
        console.log('Setting loading state to true for initial data load');
        this.isLoadingValue = true;
        // Don't show the main loading indicator for initial data load
        // this.loadingIndicatorTarget.hidden = false;

        try {
            // First fetch models only
            const modelsResponse = await this.fetchModels();
            this.modelsValue = modelsResponse;
            console.log(`Loaded ${this.modelsValue.length} models`);

            // Then fetch chat history only if authenticated
            if (this.isAuthenticatedValue) {
                const historyResponse = await this.fetchChatHistory();
                this.chatHistoryValue = historyResponse;
                console.log(`Loaded ${this.chatHistoryValue.length} history items`);

                // If the outlet connected *before* data loaded, render now.
                if (this.hasChatHistoryOutlet) {
                    console.log('Rendering history from loadInitialData (outlet was already connected).');
                    this.chatHistoryOutlet.renderHistory(this.chatHistoryValue);
                } else {
                    console.warn('History outlet not connected yet, cannot render history');
                }
            }

            this.dispatch('modelsLoaded', { detail: { models: this.modelsValue } });
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            // Reset loading state
            console.log('Setting loading state to false');
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden';

            // Force the loading indicator to be hidden with a timeout as a fallback
            setTimeout(() => {
                if (this.loadingIndicatorTarget.style.visibility === 'visible') {
                    console.log('Forcing loading indicator to hide via timeout');
                    this.loadingIndicatorTarget.style.visibility = 'hidden';
                    this.isLoadingValue = false;
                }
            }, 1000);
        }
    }

    async fetchModels() {
        console.log('Fetching models...');
        try {
            console.log('Fetching models from API');
            // Use controller's api instance with the correct path
            // Note: this.api already has baseURL set to '/api', so we just need '/models'
            // The Authorization header is automatically added by the axios interceptor
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

    async fetchChatHistory() {
        console.log('Fetching chat history...');
        try {
            // Use controller's api instance
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

                // If we get a 401 Unauthorized, try to refresh authentication
                if (error.response?.status === 401) {
                    console.log('Authentication error when fetching history, checking session...');
                    // Try to verify authentication again
                    await this.verifyAuthentication();

                    // If verification succeeded, try fetching history again
                    if (this.isAuthenticatedValue) {
                        console.log('Authentication verified, retrying history fetch...');
                        try {
                            const retryResponse = await this.api.get('/chat/history');
                            console.log('Retry chat history response:', retryResponse.data);
                            const retryHistory = retryResponse.data || [];
                            console.log(`Retry received ${retryHistory.length} history items`);
                            return retryHistory;
                        } catch (retryError) {
                            console.error('Retry error fetching chat history:', retryError);
                        }
                    }
                }
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
            const event = new CustomEvent('chat:setSelectedModels', {
                bubbles: true,
                detail: { selectedIds: [model.modelId] }
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
                userInput: prompt,
                models: this.selectedModelIdsValue,
                threadId: this.currentThreadIdValue || undefined,
                promptId,
                templateId: this.selectedTemplateIdValue || undefined,
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
                // We'll create an EventSource to listen for streaming updates
                console.log('Setting up EventSource for streaming response');

                // Get the model ID for streaming (we only support one model for streaming)
                const streamingModelId = this.selectedModelIdsValue[0];

                // For streaming, we need to make a POST request and handle the response as a stream
                // We'll use the fetch API with the appropriate headers
                const controller = new AbortController();
                const signal = controller.signal;

                // Initialize content for the streaming response
                let streamContent = '';

                // Make the POST request with Symfony session authentication

                fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream',
                        'X-Requested-With': 'XMLHttpRequest' // For Symfony to recognize AJAX requests
                    },
                    // Include credentials for Symfony session cookies
                    credentials: 'include',
                    body: JSON.stringify({
                        userInput: prompt,
                        models: [streamingModelId],
                        promptId: promptId,
                        threadId: this.currentThreadIdValue || undefined,
                        templateId: this.selectedTemplateIdValue || undefined,
                        stream: true
                    }),
                    signal: signal
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Get a reader from the response body stream
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    // Function to process the stream
                    const processStream = ({ done, value }) => {
                        if (done) {
                            console.log('Stream complete');
                            return;
                        }

                        // Decode the chunk and process it
                        const chunk = decoder.decode(value, { stream: true });
                        console.log('Received chunk:', chunk);

                        // Process each line in the chunk
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);
                                if (data === '[DONE]') {
                                    console.log('Received [DONE] message');
                                    // Update the placeholder with the final content
                                    this.updatePlaceholderMessage(promptId, streamingModelId, streamContent);
                                    return;
                                }

                                try {
                                    const event = JSON.parse(data);
                                    console.log('Parsed event:', event);

                                    // Process the event
                                    if (event.content) {
                                        streamContent += event.content;
                                        this.updateStreamingContent(promptId, streamingModelId, streamContent);
                                    }

                                    // If we have a thread ID, update it
                                    if (event.threadId && !this.currentThreadIdValue) {
                                        this.currentThreadIdValue = event.threadId;
                                        console.log('New thread created from streaming response:', this.currentThreadIdValue);
                                        this.currentMessagesValue = this.currentMessagesValue.map(msg => ({ ...msg, threadId: msg.threadId || this.currentThreadIdValue }));
                                    }
                                } catch (error) {
                                    console.error('Error parsing streaming data:', error, data);
                                }
                            }
                        }

                        // Continue reading the stream
                        return reader.read().then(processStream);
                    };

                    // Start reading the stream
                    return reader.read().then(processStream);
                })
                .catch(error => {
                    console.error('Error with streaming request:', error);
                    // If we have content, update the placeholder with the final content
                    if (streamContent) {
                        this.updatePlaceholderMessage(promptId, streamingModelId, streamContent);
                    } else {
                        this.removePlaceholders(promptId);
                    }
                });

                // Set a timeout to abort the request if it takes too long
                setTimeout(() => {
                    console.log('Aborting streaming request after timeout');
                    controller.abort();
                }, 60000); // 1 minute timeout as a safety measure
            }

            // For streaming responses, we don't need to refresh chat history
            // The streaming response is already displayed in the chat window
            // Only refresh chat history for non-streaming responses
            if (!useStreaming && this.isAuthenticatedValue) {
                console.log('Non-streaming response, refreshing chat history');
                this.chatHistoryValue = await this.fetchChatHistory();
                // Explicitly tell history outlet to render after update
                if (this.hasChatHistoryOutlet) {
                    console.log('Rendering updated history after message sent');
                    this.chatHistoryOutlet.renderHistory(this.chatHistoryValue);
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.removePlaceholders(promptId);
            const errorMessage = { role: 'system', content: `Error: Failed to get response. ${error.message || ''}`, id: `error_${Date.now()}`, threadId: this.currentThreadIdValue || null };
            this.appendMessageToDOM(errorMessage);
            this.currentMessagesValue = [...this.currentMessagesValue, errorMessage];
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden';
            this.dispatch('sendEnd');
        }
    }

    // Method to update the chat window with streaming content
    updateStreamingContent(promptId, modelId, content) {
        console.log(`Updating streaming content for ${modelId} (Prompt: ${promptId})`);

        // Find the message group for this prompt
        const messageGroupElement = this.chatWindowMessagesTarget.querySelector(`.message-group[data-prompt-id="${promptId}"]`);

        if (messageGroupElement) {
            // Find the assistant responses container
            const assistantResponsesContainer = messageGroupElement.querySelector('.assistant-responses-container');

            if (assistantResponsesContainer) {
                // Find the placeholder element for this model
                const placeholderElement = assistantResponsesContainer.querySelector(`[data-model-id="${modelId}"]`);

                if (placeholderElement) {
                    // Find the content element within the placeholder
                    const contentElement = placeholderElement.querySelector('[data-role="content"]');

                    if (contentElement) {
                        // Import marked library for Markdown parsing
                        import('marked').then(({ marked }) => {
                            // Parse Markdown content to HTML
                            const parsedContent = marked.parse(content);
                            // Update the content element with the parsed Markdown
                            contentElement.innerHTML = parsedContent;
                        }).catch(error => {
                            console.error('Error loading marked library:', error);
                            // Fallback to plain text if marked fails to load
                            contentElement.textContent = content;
                        });

                        // Keep the placeholder attribute during streaming
                        // but add a class to indicate it's being streamed
                        placeholderElement.classList.add('streaming-active');

                        // Update the message in the currentMessagesValue array
                        const messageIndex = this.currentMessagesValue.findIndex(msg =>
                            msg.promptId === promptId && msg.modelId === modelId && msg.role === 'assistant');

                        if (messageIndex !== -1) {
                            const updatedMessages = [...this.currentMessagesValue];
                            updatedMessages[messageIndex] = {
                                ...updatedMessages[messageIndex],
                                content: content,
                                isPlaceholder: false
                            };
                            this.currentMessagesValue = updatedMessages;
                        }

                        // Scroll to the bottom to show the latest content
                        this.scrollToBottom();
                    }
                }
            }
        }
    }

    updatePlaceholderMessage(promptId, modelId, finalContent, usage) {
        console.log(`Updating placeholder with final content for ${modelId} (Prompt: ${promptId})`);

        // Update the message in the currentMessagesValue array
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

            // Find the message group for this prompt
            const messageGroupElement = this.chatWindowMessagesTarget.querySelector(`.message-group[data-prompt-id="${promptId}"]`);
            if (messageGroupElement) {
                // Find the assistant responses container
                const assistantResponsesContainer = messageGroupElement.querySelector('.assistant-responses-container');
                if (assistantResponsesContainer) {
                    // Find the placeholder element for this model
                    const placeholderElement = assistantResponsesContainer.querySelector(`[data-model-id="${modelId}"]`);
                    if (placeholderElement) {
                        // Find the content element within the placeholder
                        const contentElement = placeholderElement.querySelector('[data-role="content"]');
                        if (contentElement) {
                            // Import marked library for Markdown parsing
                            import('marked').then(({ marked }) => {
                                // Parse Markdown content to HTML
                                const parsedContent = marked.parse(finalContent);
                                // Update the content element with the parsed Markdown
                                contentElement.innerHTML = parsedContent;
                            }).catch(error => {
                                console.error('Error loading marked library:', error);
                                // Fallback to plain text if marked fails to load
                                contentElement.textContent = finalContent;
                            });
                        }

                        // Remove the placeholder attribute
                        placeholderElement.removeAttribute('data-placeholder');

                        // Update usage information if available
                        const usageElement = placeholderElement.querySelector('[data-role="usage"]');
                        if (usageElement && usage) {
                            usageElement.textContent = `(Tokens: ${usage.total_tokens})`;
                        } else if (usageElement) {
                            usageElement.textContent = '';
                        }

                        // Add copy buttons if they don't exist
                        if (!placeholderElement.querySelector('.message-actions')) {
                            const actionsDiv = document.createElement('div');
                            actionsDiv.classList.add('message-actions', 'flex', 'space-x-2', 'mt-2');
                            actionsDiv.innerHTML = `
                                <button class="copy-markdown-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsMarkdown" data-original-content="${finalContent}">Kopírovat jako Markdown</button>
                                <button class="copy-html-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsHtml">Kopírovat jako HTML</button>
                            `;
                            placeholderElement.appendChild(actionsDiv);
                        }

                        // Add a class to indicate the response is complete
                        placeholderElement.classList.add('response-complete');

                        // Add a highlight effect to show the response is complete
                        placeholderElement.classList.add('highlight-complete');
                        setTimeout(() => {
                            placeholderElement.classList.remove('highlight-complete');
                        }, 1000);
                    }
                }

                // Scroll to the bottom to show the final content
                this.scrollToBottom();
            }
        } else {
            // If we couldn't find the placeholder, create a new message
            console.warn(`Could not find placeholder message in state for model ${modelId} and prompt ${promptId} to update.`);
            const finalMessage = {
                role: 'assistant',
                content: finalContent,
                modelId,
                id: `msg_${Date.now()}_${modelId}_final`,
                threadId: this.currentThreadIdValue || null,
                promptId,
                usage: usage
            };
            this.appendMessageToDOM(finalMessage);
            this.currentMessagesValue = [...this.currentMessagesValue, finalMessage];

            // Scroll to the bottom to show the new message
            this.scrollToBottom();
        }
    }

    removePlaceholders(promptId) {
        // Remove placeholders from the currentMessagesValue array
        this.currentMessagesValue = this.currentMessagesValue.filter(msg => !(msg.promptId === promptId && msg.role === 'assistant' && msg.isPlaceholder));

        // Find the message group for this prompt
        const messageGroupElement = this.chatWindowMessagesTarget.querySelector(`.message-group[data-prompt-id="${promptId}"]`);
        if (messageGroupElement) {
            // Find the assistant responses container
            const assistantResponsesContainer = messageGroupElement.querySelector('.assistant-responses-container');
            if (assistantResponsesContainer) {
                // Find and remove all placeholder elements
                assistantResponsesContainer.querySelectorAll(`[data-placeholder="true"]`).forEach(el => el.remove());

                // If there are no assistant responses left, remove the entire message group
                if (assistantResponsesContainer.children.length === 0) {
                    messageGroupElement.remove();
                }
            }
        } else {
            // Fallback to the old method if message group not found
            this.chatWindowMessagesTarget.querySelectorAll(`[data-prompt-id="${promptId}"][data-role="assistant"][data-placeholder="true"]`).forEach(el => el.remove());
        }
    }

    async handleSelectChat({ detail: { threadId } }) {
        console.log('Selecting chat thread:', threadId);
        if (this.currentThreadIdValue === threadId) return;

        // Set loading state but don't show the main loading indicator for chat selection
        this.isLoadingValue = true;
        // Don't show the main loading indicator for chat selection
        // this.loadingIndicatorTarget.hidden = false;
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

            // Preload template information for all templates used in the messages
            await this.preloadTemplateInfo(this.currentMessagesValue);

            // Clear the chat window before adding new messages
            this.clearChatWindow();

            // Check if there are any assistant messages in the thread
            const hasAssistantMessages = this.currentMessagesValue.some(msg => msg.role === 'assistant');
            console.log('Thread has assistant messages:', hasAssistantMessages);

            // Group messages by promptId to ensure we add them in the right order
            const messagesByPrompt = {};
            this.currentMessagesValue.forEach(msg => {
                const promptId = msg.promptId || (msg.id && msg.id.includes('_') ? msg.id.split('_')[1] : null) || `prompt_${Date.now()}`;
                if (!messagesByPrompt[promptId]) {
                    messagesByPrompt[promptId] = [];
                }
                messagesByPrompt[promptId].push(msg);
            });

            // Add messages in order: first user messages, then assistant messages
            Object.values(messagesByPrompt).forEach(messages => {
                // First add user messages
                messages.filter(msg => msg.role === 'user').forEach(msg => this.appendMessageToDOM(msg));

                // Then add assistant messages, but only if there are any
                const assistantMessages = messages.filter(msg => msg.role === 'assistant');
                if (assistantMessages.length > 0) {
                    assistantMessages.forEach(msg => this.appendMessageToDOM(msg));
                }
            });

            // After adding all messages, remove any empty assistant responses containers
            document.querySelectorAll('.assistant-responses-container:empty').forEach(container => {
                console.log('Removing empty assistant responses container');
                container.remove();
            });

            // Extract unique model IDs from assistant messages in the thread
            console.log('Current messages in thread:', this.currentMessagesValue);

            const assistantMessages = this.currentMessagesValue.filter(m => m.role === 'assistant' && m.modelId);
            console.log('Assistant messages with modelId:', assistantMessages);

            const modelIdsInThread = [...new Set(assistantMessages.map(m => m.modelId))];
            console.log('Unique model IDs in thread:', modelIdsInThread);

            // Only update if there are models in the thread
            if (modelIdsInThread.length > 0) {
                console.log('Setting selectedModelIdsValue to:', modelIdsInThread);
                this.selectedModelIdsValue = modelIdsInThread;

                // Dispatch the event with the correct name to match the listener in model-selector controller
                console.log('Dispatching setSelectedModels event with selectedIds:', modelIdsInThread);

                // Try different event naming patterns to ensure it's received
                this.dispatch('setSelectedModels', { detail: { selectedIds: modelIdsInThread } });
                this.dispatch('set-selected-models', { detail: { selectedIds: modelIdsInThread } });

                // Dispatch a global event that can be caught by any listener
                console.log('Dispatching global chat:setSelectedModels event');
                const event = new CustomEvent('chat:setSelectedModels', {
                    detail: { selectedIds: modelIdsInThread },
                    bubbles: true
                });
                document.dispatchEvent(event);

                // Also try a direct call to the model-selector element if possible
                const modelSelectorElement = document.querySelector('[data-controller="model-selector"]');
                if (modelSelectorElement) {
                    console.log('Found model-selector element, dispatching event directly');
                    modelSelectorElement.dispatchEvent(new CustomEvent('chat:setSelectedModels', {
                        detail: { selectedIds: modelIdsInThread },
                        bubbles: true
                    }));
                }

                // Also try a direct approach by finding the model-selector controller
                const modelSelectorController = document.querySelector('[data-controller="model-selector"]');
                if (modelSelectorController) {
                    console.log('Found model-selector controller, setting selectedIds directly');

                    // Set the value directly on the controller
                    if (modelSelectorController.hasAttribute('data-model-selector-selected-ids-value')) {
                        modelSelectorController.setAttribute('data-model-selector-selected-ids-value', JSON.stringify(modelIdsInThread));
                    }

                    // Try to access the Stimulus controller instance
                    try {
                        // This is a bit of a hack to access the Stimulus controller instance
                        // It might not work in all versions of Stimulus
                        const controllerInstance = window.Stimulus.getControllerForElementAndIdentifier(modelSelectorController, 'model-selector');
                        if (controllerInstance) {
                            console.log('Found Stimulus controller instance, calling chatSetSelectedModels directly');
                            controllerInstance.chatSetSelectedModels({ detail: { selectedIds: modelIdsInThread } });
                        }
                    } catch (error) {
                        console.error('Error accessing Stimulus controller instance:', error);
                    }
                }

                // Get model names for the notification
                const modelNames = this.modelsValue
                    .filter(model => modelIdsInThread.includes(model.id))
                    .map(model => model.name)
                    .join(', ');

                // Show a notification about the selected models
                if (modelNames) {
                    this.showNotification(`Selected models: ${modelNames}`, 'info');
                }
            }

            console.log('Chat loaded:', threadId, 'Messages:', this.currentMessagesValue.length);
        } catch (error) {
            console.error('Error loading thread history:', error);
            const errorMessage = { role: 'system', content: `Error: Failed to load chat history. ${error.message || ''}`, id: `error_load_${Date.now()}`, threadId: null };
            this.appendMessageToDOM(errorMessage);
            this.currentThreadIdValue = null;
            this.currentMessagesValue = [errorMessage];
        } finally {
            this.isLoadingValue = false;
            this.loadingIndicatorTarget.style.visibility = 'hidden';
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
                promptId: group.promptId,
                templateId: group.usedTemplateId || undefined, // Include template ID if available
                templateName: group.usedTemplateName || undefined // Include template name if available
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
        // Set loading state but don't show the main loading indicator for new chat creation
        this.isLoadingValue = true;
        // Don't show the main loading indicator for new chat creation
        // this.loadingIndicatorTarget.hidden = false;

        try {
            // Use controller's api instance
            const response = await this.api.post('/chat/thread');
            const { threadId } = response.data;
            console.log('New thread created:', threadId);

            this.currentThreadIdValue = threadId;
            this.currentMessagesValue = [];
            this.selectedModelIdsValue = [];
            this.selectedTemplateIdValue = 0; // Reset template selection
            this.clearChatWindow();
            this.dispatch('setSelectedModels', { detail: { selectedIds: [] } });
            this.dispatch('clearTemplate'); // Clear template selection

            // Refresh chat history only if authenticated
            if (this.isAuthenticatedValue) {
                this.chatHistoryValue = await this.fetchChatHistory();
                // Explicitly tell history outlet to render after update
                if (this.hasChatHistoryOutlet) {
                    console.log('Rendering updated history after new chat created');
                    this.chatHistoryOutlet.renderHistory(this.chatHistoryValue);
                }
            }
        } catch (error) {
            console.error('Error starting new chat:', error);
             const errorMessage = { role: 'system', content: `Error: Failed to start new chat. ${error.message || ''}`, id: `error_new_${Date.now()}`, threadId: null };
            this.appendMessageToDOM(errorMessage);
        } finally {
             this.isLoadingValue = false;
             this.loadingIndicatorTarget.style.visibility = 'hidden';
        }
    }

    // --- UI Helpers ---

    clearChatWindow() {
        this.chatWindowMessagesTarget.innerHTML = '';
    }

    // Method to copy content as Markdown
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
                    this.showNotification('Nepodařilo se zkopírovat text', 'error');
                });
        }
    }

    // Method to copy content as HTML
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
                    this.showNotification('Nepodařilo se zkopírovat HTML', 'error');
                });
        }
    }

    // Helper method to show feedback after copying
    showCopyFeedback(button, message) {
        const originalText = button.textContent;
        button.textContent = message;
        button.classList.add('bg-green-200');

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-200');
        }, 2000);
    }

    showNotification(message, type = 'warning', duration = 3000) {
        // Create a notification element
        const notification = document.createElement('div');

        // Determine background color based on notification type
        let bgColorClass = 'bg-yellow-500';
        if (type === 'error') bgColorClass = 'bg-red-500';
        if (type === 'info') bgColorClass = 'bg-blue-500';
        if (type === 'success') bgColorClass = 'bg-green-500';

        notification.classList.add(
            'fixed', 'bottom-4', 'left-1/2', 'transform', '-translate-x-1/2',
            'px-4', 'py-2', 'rounded', 'shadow-lg', 'z-50', 'text-white',
            bgColorClass, 'flex', 'items-center', 'space-x-2'
        );

        // For longer messages, add max-width and allow text wrapping
        if (message.length > 100 || message.includes('\n')) {
            notification.classList.add('max-w-lg');
            notification.style.whiteSpace = 'pre-wrap';
            notification.style.textAlign = 'left';
        }

        // Add an icon based on the notification type
        let iconSvg = '';
        if (type === 'warning') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
        } else if (type === 'info') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        } else if (type === 'success') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
        }

        // Add a close button for longer notifications
        const closeButton = duration > 5000 ? '<button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.remove();">×</button>' : '';

        notification.innerHTML = `
            <div class="flex-shrink-0">${iconSvg}</div>
            <div>${message}</div>
            ${closeButton}
        `;

        // Add to the DOM
        document.body.appendChild(notification);

        // Add entrance animation
        notification.classList.add('animate-notification-in');

        // Remove after specified duration
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => notification.remove(), 500);
        }, duration);
    }

    // Force hide all loading indicators
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

    // Handle logout button click
    logout() {
        console.log('Logging out...');

        // For Symfony session auth, we need to redirect to the logout route
        this.showNotification('Logging out...', 'info');

        // Redirect to Symfony's logout route
        window.location.href = '/logout';
    }

    appendMessageToDOM(message) {
        // For user messages, we need to check if we need to create a new message group
        if (message.role === 'user') {
            // Create a message group container for this prompt
            const messageGroupElement = document.createElement('div');
            messageGroupElement.classList.add('message-group');
            messageGroupElement.dataset.promptId = message.promptId || `prompt_${Date.now()}`;

            // Create the user message element
            const userMessageElement = document.createElement('div');
            userMessageElement.classList.add('message', 'message--user');
            userMessageElement.dataset.messageId = message.id;
            userMessageElement.dataset.role = 'user';

            // Add user message content
            // Check if a template was used for this message
            const templateId = this.selectedTemplateIdValue || message.templateId;
            // Use the template name from the message if available, otherwise fetch it
            let templateName = message.templateName;
            const templateInfo = templateId ? (templateName ? { name: templateName } : this.getTemplateInfo(templateId)) : null;
            const templateMention = templateInfo ? `<div class="template-mention text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-md mt-2 inline-block" data-template-id="${templateId}">🔖 Použita šablona: <strong>${templateInfo.name}</strong></div>` : '';

            userMessageElement.innerHTML = `
                <div class="message-header font-semibold text-blue-600">User</div>
                <div class="message-content" data-role="content">${message.content || ''}</div>
                ${templateMention}
            `;

            // Add user message to the group
            messageGroupElement.appendChild(userMessageElement);

            // We'll create the assistant responses container only when needed
            // This will be done when the first assistant message for this prompt is added

            // Add the message group to the chat window
            this.chatWindowMessagesTarget.appendChild(messageGroupElement);
        } else if (message.role === 'assistant') {
            // For assistant messages, find the corresponding message group
            const promptId = message.promptId || (message.id && message.id.includes('_') ? message.id.split('_')[1] : null);
            let messageGroupElement = this.chatWindowMessagesTarget.querySelector(`.message-group[data-prompt-id="${promptId}"]`);

            // If no message group found, create a new one (fallback)
            if (!messageGroupElement) {
                messageGroupElement = document.createElement('div');
                messageGroupElement.classList.add('message-group');
                messageGroupElement.dataset.promptId = promptId || `prompt_${Date.now()}`;

                // Add the message group to the chat window
                this.chatWindowMessagesTarget.appendChild(messageGroupElement);
            }

            // Find or create the assistant responses container
            let assistantResponsesContainer = messageGroupElement.querySelector('.assistant-responses-container');
            if (!assistantResponsesContainer) {
                // Create the container if it doesn't exist
                assistantResponsesContainer = document.createElement('div');
                assistantResponsesContainer.classList.add('assistant-responses-container');
                messageGroupElement.appendChild(assistantResponsesContainer);
                console.log('Created assistant responses container for prompt:', promptId);
            }

            // Create the assistant message element
            const assistantMessageElement = document.createElement('div');
            assistantMessageElement.classList.add('message', 'message--assistant');
            assistantMessageElement.dataset.messageId = message.id;
            assistantMessageElement.dataset.modelId = message.modelId;
            assistantMessageElement.dataset.promptId = promptId;
            assistantMessageElement.dataset.role = 'assistant';
            if (message.isPlaceholder) assistantMessageElement.dataset.placeholder = 'true';

            // Get model name
            const modelName = this.modelsValue.find(m => m.id === message.modelId)?.name || 'Assistant';

            // Import marked library for Markdown parsing
            import('marked').then(({ marked }) => {
                // Parse Markdown content to HTML
                const parsedContent = marked.parse(message.content || '');

                // Add assistant message content with parsed Markdown
                assistantMessageElement.innerHTML = `
                    <div class="message-header font-semibold text-green-600">${modelName}</div>
                    <div class="message-content assistant-content" data-role="content">${parsedContent}</div>
                    ${message.usage ? `<div class="message-usage text-xs text-gray-500" data-role="usage">(Tokens: ${message.usage.total_tokens})</div>` : ''}
                    <div class="message-actions flex space-x-2 mt-2">
                        <button class="copy-markdown-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsMarkdown" data-original-content="${message.content || ''}">Kopírovat jako Markdown</button>
                        <button class="copy-html-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsHtml">Kopírovat jako HTML</button>
                    </div>
                `;
            }).catch(error => {
                console.error('Error loading marked library:', error);
                // Fallback to plain text if marked fails to load
                assistantMessageElement.innerHTML = `
                    <div class="message-header font-semibold text-green-600">${modelName}</div>
                    <div class="message-content assistant-content" data-role="content">${message.content || ''}</div>
                    ${message.usage ? `<div class="message-usage text-xs text-gray-500" data-role="usage">(Tokens: ${message.usage.total_tokens})</div>` : ''}
                    <div class="message-actions flex space-x-2 mt-2">
                        <button class="copy-markdown-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsMarkdown" data-original-content="${message.content || ''}">Kopírovat jako Markdown</button>
                        <button class="copy-html-btn px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-action="click->chat#copyAsHtml">Kopírovat jako HTML</button>
                    </div>
                `;
            });

            // Add the assistant message to the responses container
            assistantResponsesContainer.appendChild(assistantMessageElement);

            // Make sure the container is visible
            assistantResponsesContainer.classList.add('has-messages');
        } else {
            // For system messages or other types
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `message--${message.role}`);
            messageElement.dataset.messageId = message.id;

            // Add system message content
            messageElement.innerHTML = `
                <div class="message-header font-semibold text-gray-600">System</div>
                <div class="message-content" data-role="content">${message.content || ''}</div>
            `;

            // Add the message to the chat window
            this.chatWindowMessagesTarget.appendChild(messageElement);
        }

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

        // Check if we've already fetched this template
        if (this._templateCache && this._templateCache[templateId]) {
            return this._templateCache[templateId];
        }

        // Initialize template cache if it doesn't exist
        if (!this._templateCache) {
            this._templateCache = {};
        }

        // Fallback: If we don't have the template info, return a temporary object and fetch the template
        const tempTemplate = { name: `Načítání šablony...` };
        this._templateCache[templateId] = tempTemplate;

        // Fetch the template info from the backend
        this.fetchTemplateInfo(templateId).then(template => {
            if (template) {
                // Update the cache with the fetched template
                this._templateCache[templateId] = template;

                // Find and update any existing template mentions in the DOM
                document.querySelectorAll(`.template-mention[data-template-id="${templateId}"]`).forEach(el => {
                    el.innerHTML = `🔖 Použita šablona: <strong>${template.name}</strong>`;
                });
            }
        }).catch(error => {
            console.error(`Error fetching template info for ID ${templateId}:`, error);
            // Update the cache with an error state
            this._templateCache[templateId] = { name: `Šablona ${templateId}` };
        });

        return tempTemplate;
    }

    // Fetch template info from the backend
    async fetchTemplateInfo(templateId) {
        try {
            const response = await this.api.get(`/api/prompt-templates/${templateId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching template ${templateId}:`, error);
            return null;
        }
    }

    // Preload template information for all templates used in messages
    async preloadTemplateInfo(messages) {
        // Extract unique template IDs from messages
        const templateIds = new Set();
        messages.forEach(message => {
            if (message.templateId) {
                templateIds.add(message.templateId);
            }
        });

        // Initialize template cache if it doesn't exist
        if (!this._templateCache) {
            this._templateCache = {};
        }

        // Fetch template information for each template ID
        const fetchPromises = [];
        templateIds.forEach(templateId => {
            // Skip if we already have this template in the cache
            if (this._templateCache[templateId] && this._templateCache[templateId].name !== 'Načítání šablony...') {
                return;
            }

            // Create a temporary entry in the cache
            this._templateCache[templateId] = { name: 'Načítání šablony...' };

            // Fetch the template information
            const fetchPromise = this.fetchTemplateInfo(templateId).then(template => {
                if (template) {
                    // Update the cache with the fetched template
                    this._templateCache[templateId] = template;
                } else {
                    // Update the cache with a generic name if fetch failed
                    this._templateCache[templateId] = { name: `Šablona ${templateId}` };
                }
            }).catch(error => {
                console.error(`Error preloading template ${templateId}:`, error);
                // Update the cache with a generic name if fetch failed
                this._templateCache[templateId] = { name: `Šablona ${templateId}` };
            });

            fetchPromises.push(fetchPromise);
        });

        // Wait for all fetch promises to complete
        if (fetchPromises.length > 0) {
            console.log(`Preloading ${fetchPromises.length} templates...`);
            await Promise.all(fetchPromises);
            console.log('Template preloading complete');
        }
    }
}
