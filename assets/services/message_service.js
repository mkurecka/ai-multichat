/**
 * Service for handling message formatting and DOM manipulation
 */
export default class MessageService {
    constructor(chatWindowElement, modelsProvider) {
        this.chatWindow = chatWindowElement;
        this.modelsProvider = modelsProvider; // Function or object that provides model data
        this._templateCache = {}; // Cache for template info
    }

    /**
     * Create a user message object
     * @param {string} content - Message content
     * @param {string} threadId - Thread ID
     * @param {number} templateId - Template ID
     * @param {string} templateName - Template name
     * @returns {Object} User message object
     */
    createUserMessage(content, threadId, templateId, templateName) {
        return {
            role: 'user',
            content: content,
            id: `msg_${Date.now()}`,
            threadId: threadId || null,
            templateId: templateId,
            templateName: templateName
        };
    }

    /**
     * Create placeholder messages for each model
     * @param {Array} modelIds - Array of model IDs
     * @param {string} threadId - Thread ID
     * @param {string} promptId - Prompt ID
     * @returns {Array} Array of placeholder message objects
     */
    createModelPlaceholders(modelIds, threadId, promptId) {
        return modelIds.map(modelId => ({
            role: 'assistant',
            content: '...',
            modelId,
            id: `msg_${Date.now()}_${modelId}`,
            threadId: threadId || null,
            promptId,
            isPlaceholder: true
        }));
    }

    /**
     * Append a message to the DOM
     * @param {Object} message - Message object
     */
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
            const templateId = message.templateId;
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

            // Add the message group to the chat window
            this.chatWindow.appendChild(messageGroupElement);
        } else if (message.role === 'assistant') {
            // For assistant messages, find the corresponding message group
            const promptId = message.promptId || (message.id && message.id.includes('_') ? message.id.split('_')[1] : null);
            let messageGroupElement = this.chatWindow.querySelector(`.message-group[data-prompt-id="${promptId}"]`);

            // If no message group found, create a new one (fallback)
            if (!messageGroupElement) {
                messageGroupElement = document.createElement('div');
                messageGroupElement.classList.add('message-group');
                messageGroupElement.dataset.promptId = promptId || `prompt_${Date.now()}`;

                // Add the message group to the chat window
                this.chatWindow.appendChild(messageGroupElement);
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
            const modelName = this.getModelName(message.modelId) || 'Assistant';

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
            this.chatWindow.appendChild(messageElement);
        }

        this.scrollToBottom();
    }

    /**
     * Update streaming content in the DOM
     * @param {string} promptId - Prompt ID
     * @param {string} modelId - Model ID
     * @param {string} content - Content to update
     */
    updateStreamingContent(promptId, modelId, content) {
        console.log(`Updating streaming content for ${modelId} (Prompt: ${promptId})`);

        // Find the message group for this prompt
        const messageGroupElement = this.chatWindow.querySelector(`.message-group[data-prompt-id="${promptId}"]`);

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

                        // Scroll to the bottom to show the latest content
                        this.scrollToBottom();
                    }
                }
            }
        }
    }

    /**
     * Update placeholder message with final content
     * @param {string} promptId - Prompt ID
     * @param {string} modelId - Model ID
     * @param {string} finalContent - Final content
     * @param {Object} usage - Usage information
     */
    updatePlaceholderMessage(promptId, modelId, finalContent, usage) {
        console.log(`Updating placeholder with final content for ${modelId} (Prompt: ${promptId})`);

        // Find the message group for this prompt
        const messageGroupElement = this.chatWindow.querySelector(`.message-group[data-prompt-id="${promptId}"]`);
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
    }

    /**
     * Remove placeholder messages for a prompt
     * @param {string} promptId - Prompt ID
     */
    removePlaceholders(promptId) {
        // Find the message group for this prompt
        const messageGroupElement = this.chatWindow.querySelector(`.message-group[data-prompt-id="${promptId}"]`);
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
            this.chatWindow.querySelectorAll(`[data-prompt-id="${promptId}"][data-role="assistant"][data-placeholder="true"]`).forEach(el => el.remove());
        }
    }

    /**
     * Remove a specific placeholder message for a model
     * @param {string} promptId - Prompt ID
     * @param {string} modelId - Model ID
     */
    removePlaceholderForModel(promptId, modelId) {
        // Find the message group for this prompt
        const messageGroupElement = this.chatWindow.querySelector(`.message-group[data-prompt-id="${promptId}"]`);
        if (messageGroupElement) {
            // Find the assistant responses container
            const assistantResponsesContainer = messageGroupElement.querySelector('.assistant-responses-container');
            if (assistantResponsesContainer) {
                // Find and remove the specific placeholder element for this model
                const placeholder = assistantResponsesContainer.querySelector(`[data-model-id="${modelId}"][data-placeholder="true"]`);
                if (placeholder) {
                    placeholder.remove();
                }

                // If there are no assistant responses left, remove the entire message group
                if (assistantResponsesContainer.children.length === 0) {
                    messageGroupElement.remove();
                }
            }
        } else {
            // Fallback to the old method if message group not found
            this.chatWindow.querySelectorAll(`[data-prompt-id="${promptId}"][data-model-id="${modelId}"][data-role="assistant"][data-placeholder="true"]`).forEach(el => el.remove());
        }
    }

    /**
     * Clear the chat window
     */
    clearChatWindow() {
        this.chatWindow.innerHTML = '';
    }

    /**
     * Scroll to the bottom of the chat window
     */
    scrollToBottom() {
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    /**
     * Get model name from model ID
     * @param {string} modelId - Model ID
     * @returns {string} Model name
     */
    getModelName(modelId) {
        if (!this.modelsProvider) return 'Assistant';

        // If modelsProvider is a function, call it to get models
        const models = typeof this.modelsProvider === 'function'
            ? this.modelsProvider()
            : this.modelsProvider;

        // Find the model with the given ID
        const model = models.find(m => m.id === modelId);
        return model ? model.name : 'Assistant';
    }

    /**
     * Get template information by ID
     * @param {number|string} templateId - Template ID
     * @returns {Object|null} Template information
     */
    getTemplateInfo(templateId) {
        // If templateId is undefined or null, return null
        if (!templateId) {
            return null;
        }

        // Check if we've already fetched this template
        if (this._templateCache && this._templateCache[templateId]) {
            return this._templateCache[templateId];
        }

        // Initialize template cache if it doesn't exist
        if (!this._templateCache) {
            this._templateCache = {};
        }

        // Return a temporary object
        return { name: `Template ${templateId}` };
    }

    /**
     * Set template cache
     * @param {Object} cache - Template cache
     */
    setTemplateCache(cache) {
        this._templateCache = cache || {};
    }

    /**
     * Update template cache with a single template
     * @param {number|string} templateId - Template ID
     * @param {Object} templateInfo - Template information
     */
    updateTemplateCache(templateId, templateInfo) {
        if (!this._templateCache) {
            this._templateCache = {};
        }
        this._templateCache[templateId] = templateInfo;

        // Find and update any existing template mentions in the DOM
        document.querySelectorAll(`.template-mention[data-template-id="${templateId}"]`).forEach(el => {
            el.innerHTML = `🔖 Použita šablona: <strong>${templateInfo.name}</strong>`;
        });
    }
}
