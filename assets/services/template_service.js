/**
 * Service for handling template-related functionality
 */
export default class TemplateService {
    constructor(apiService) {
        this.apiService = apiService;
        this._templateCache = {};
    }

    /**
     * Get template information by ID
     * @param {number|string} templateId - Template ID
     * @returns {Promise<Object|null>} Template information
     */
    async getTemplateInfo(templateId) {
        // If templateId is undefined or null, return null
        if (!templateId) {
            return null;
        }

        // Check if we've already fetched this template
        if (this._templateCache[templateId]) {
            return this._templateCache[templateId];
        }

        // Fetch the template info from the backend
        try {
            const template = await this.apiService.getTemplateInfo(templateId);
            if (template) {
                // Update the cache with the fetched template
                this._templateCache[templateId] = template;
                return template;
            }
        } catch (error) {
            console.error(`Error fetching template info for ID ${templateId}:`, error);
        }

        // Return a generic template if fetch failed
        return { name: `Template ${templateId}` };
    }

    /**
     * Preload template information for all templates used in messages
     * @param {Array} messages - Array of message objects
     * @returns {Promise<void>}
     */
    async preloadTemplateInfo(messages) {
        // Extract unique template IDs from messages
        const templateIds = new Set();
        messages.forEach(message => {
            if (message.templateId) {
                templateIds.add(message.templateId);
            }
        });

        // Fetch template information for each template ID
        const fetchPromises = [];
        templateIds.forEach(templateId => {
            // Skip if we already have this template in the cache
            if (this._templateCache[templateId] && this._templateCache[templateId].name !== 'Loading template...') {
                return;
            }

            // Create a temporary entry in the cache
            this._templateCache[templateId] = { name: 'Loading template...' };

            // Fetch the template information
            const fetchPromise = this.getTemplateInfo(templateId);
            fetchPromises.push(fetchPromise);
        });

        // Wait for all fetch promises to complete
        if (fetchPromises.length > 0) {
            console.log(`Preloading ${fetchPromises.length} templates...`);
            await Promise.all(fetchPromises);
            console.log('Template preloading complete');
        }
    }

    /**
     * Get the template cache
     * @returns {Object} Template cache
     */
    getTemplateCache() {
        return this._templateCache;
    }

    /**
     * Update template mentions in the DOM
     * @param {number|string} templateId - Template ID
     * @param {Object} template - Template information
     */
    updateTemplateMentions(templateId, template) {
        // Find and update any existing template mentions in the DOM
        document.querySelectorAll(`.template-mention[data-template-id="${templateId}"]`).forEach(el => {
            el.innerHTML = `🔖 Použita šablona: <strong>${template.name}</strong>`;
        });
    }
}
