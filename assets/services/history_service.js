/**
 * Service for handling chat history
 */
export default class HistoryService {
    constructor(apiService) {
        this.apiService = apiService;
    }

    /**
     * Flatten the grouped history from the API
     * @param {Array} groupedMessages - Grouped messages from the API
     * @param {string} threadId - Thread ID
     * @returns {Array} Flattened messages
     */
    flattenHistory(groupedMessages, threadId) {
        const flatMessages = [];
        groupedMessages.forEach(group => {
            // Add user message
            flatMessages.push({
                role: 'user',
                content: group.prompt,
                id: `user_${group.promptId || Date.now()}`, // Generate ID if missing
                threadId: threadId,
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
                        threadId: threadId,
                        promptId: group.promptId,
                        usage: responseData.usage
                    });
                });
            }
        });
        return flatMessages;
    }

    /**
     * Get unique model IDs from messages
     * @param {Array} messages - Array of message objects
     * @returns {Array} Array of unique model IDs
     */
    getUniqueModelIds(messages) {
        const assistantMessages = messages.filter(m => m.role === 'assistant' && m.modelId);
        return [...new Set(assistantMessages.map(m => m.modelId))];
    }

    /**
     * Group messages by prompt ID
     * @param {Array} messages - Array of message objects
     * @returns {Object} Object with prompt IDs as keys and arrays of messages as values
     */
    groupMessagesByPrompt(messages) {
        const messagesByPrompt = {};
        messages.forEach(msg => {
            const promptId = msg.promptId || (msg.id && msg.id.includes('_') ? msg.id.split('_')[1] : null) || `prompt_${Date.now()}`;
            if (!messagesByPrompt[promptId]) {
                messagesByPrompt[promptId] = [];
            }
            messagesByPrompt[promptId].push(msg);
        });
        return messagesByPrompt;
    }
}
