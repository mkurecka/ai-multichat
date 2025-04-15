import { Controller } from '@hotwired/stimulus';

/**
 * Template selector controller
 * Handles:
 * - Loading available templates for the user
 * - Displaying a dropdown of templates with search/autocomplete
 * - Selecting a template and applying it to the chat
 */
export default class extends Controller {
    static targets = [
        "dropdown",
        "searchInput",
        "templateList",
        "noTemplatesMessage",
        "selectedCount",
        "selectedTemplateContainer"
    ];

    static values = {
        templates: Array,
        selectedTemplateId: Number,
        searchTerm: String,
        isOpen: Boolean
    };

    static outlets = ['chat']; // Connect to the main chat controller

    connect() {
        console.log('Template selector controller connected');

        // Initialize values
        this.searchTermValue = '';
        this.isOpenValue = false;

        // Add listeners for clicking outside and keyboard events
        this.boundClickOutside = this.clickOutside.bind(this);
        document.addEventListener('click', this.boundClickOutside);

        this.boundKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.boundKeyDown);

        // Initialize dropdown display
        if (this.hasDropdownTarget) {
            this.dropdownTarget.hidden = true;
        }

        // Add some dummy templates for testing
        this.templatesValue = [
            { id: 1, name: 'Test Template 1', description: 'This is a test template', scope: 'private', associatedModel: { id: 1, modelId: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' } },
            { id: 2, name: 'Test Template 2', description: 'Another test template', scope: 'organization', associatedModel: { id: 2, modelId: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' } },
            { id: 3, name: 'Test Template 3', description: 'Yet another test template', scope: 'private', associatedModel: { id: 3, modelId: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' } },
            { id: 4, name: 'Customer Support Template', description: 'Template for customer support responses', scope: 'organization', associatedModel: { id: 2, modelId: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' } },
            { id: 5, name: 'Marketing Email Template', description: 'Template for marketing emails', scope: 'private', associatedModel: { id: 1, modelId: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' } }
        ];

        // Render the templates immediately
        this.render();

        // Also try to load templates from the server
        this.loadTemplates();

        // Update selected count
        this.updateSelectedCount();
    }

    async loadTemplates() {
        console.log('Loading templates...');
        try {
            const response = await fetch('/api/prompt-templates', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            console.log('Template API response status:', response.status);

            if (!response.ok) {
                // For debugging, let's try to read the response text
                const responseText = await response.text();
                console.log('Error response text:', responseText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Templates loaded:', data);
            this.templatesValue = data;
            this.render();
        } catch (error) {
            console.error('Error loading templates:', error);
            // For debugging, add a visible error message
            this.element.innerHTML += `<div style="color: red; padding: 10px;">Error loading templates: ${error.message}</div>`;

            // Add some dummy templates for testing
            this.templatesValue = [
                { id: 1, name: 'Test Template 1', description: 'This is a test template', scope: 'private', associatedModel: { id: 1, modelId: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' } },
                { id: 2, name: 'Test Template 2', description: 'Another test template', scope: 'organization', associatedModel: { id: 2, modelId: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' } },
                { id: 3, name: 'Test Template 3', description: 'Yet another test template', scope: 'private', associatedModel: { id: 3, modelId: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' } }
            ];
            this.render();
        }
    }

    // Main render method - calls all sub-render methods
    render() {
        console.log('Rendering template selector');

        // Hide the entire template selector if there are no templates
        if (this.templatesValue.length === 0) {
            console.log('No templates available, hiding template selector');
            this.element.style.display = 'none';
            return;
        } else {
            this.element.style.display = 'block';
        }

        this.renderTemplateList();
        this.renderSelectedTemplate();
        this.updateSelectedCount();
        this.renderDropdownVisibility();
    }

    // Render the template list based on search term
    renderTemplateList() {
        console.log('Rendering template list');
        if (!this.hasTemplateListTarget) {
            console.error('Template list target not found!');
            return;
        }

        const templateList = this.templateListTarget;
        templateList.innerHTML = '';

        // Filter templates based on search term
        const searchTermLower = (this.searchTermValue || '').toLowerCase();
        const filtered = this.templatesValue.filter(template =>
            template.name.toLowerCase().includes(searchTermLower) ||
            (template.description && template.description.toLowerCase().includes(searchTermLower))
        );

        console.log(`Filtered templates: ${filtered.length} of ${this.templatesValue.length}`);

        if (filtered.length === 0) {
            if (this.hasNoTemplatesMessageTarget) {
                this.noTemplatesMessageTarget.hidden = false;
            }
            return;
        }

        if (this.hasNoTemplatesMessageTarget) {
            this.noTemplatesMessageTarget.hidden = true;
        }

        // Group templates by scope
        const privateTemplates = filtered.filter(t => t.scope === 'private');
        const orgTemplates = filtered.filter(t => t.scope === 'organization');

        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();

        // Add a header to show how many templates are available
        const header = document.createElement('div');
        header.classList.add('text-sm', 'font-semibold', 'text-gray-700', 'mb-2', 'pb-2', 'border-b');
        header.textContent = `${filtered.length} templates available`;
        fragment.appendChild(header);

        // Add private templates
        if (privateTemplates.length > 0) {
            const privateGroup = document.createElement('div');
            privateGroup.className = 'mb-4';

            const privateHeader = document.createElement('div');
            privateHeader.className = 'text-xs font-medium text-gray-500 mb-2';
            privateHeader.textContent = 'My Templates';
            privateGroup.appendChild(privateHeader);

            privateTemplates.forEach(template => {
                privateGroup.appendChild(this.createTemplateItem(template));
            });

            fragment.appendChild(privateGroup);
        }

        // Add organization templates
        if (orgTemplates.length > 0) {
            const orgGroup = document.createElement('div');
            orgGroup.className = 'mb-4';

            const orgHeader = document.createElement('div');
            orgHeader.className = 'text-xs font-medium text-gray-500 mb-2';
            orgHeader.textContent = 'Organization Templates';
            orgGroup.appendChild(orgHeader);

            orgTemplates.forEach(template => {
                orgGroup.appendChild(this.createTemplateItem(template));
            });

            fragment.appendChild(orgGroup);
        }

        templateList.appendChild(fragment);
    }

    createTemplateItem(template) {
        const isSelected = this.selectedTemplateIdValue === template.id;

        const item = document.createElement('div');
        item.className = 'p-3 border rounded-lg mb-2 cursor-pointer hover:bg-blue-50 transition-colors';
        if (isSelected) {
            item.classList.add('bg-blue-100', 'border-blue-300');
        } else {
            item.classList.add('border-gray-200');
        }

        item.dataset.templateId = template.id;
        item.dataset.action = 'click->template-selector#selectTemplate';

        // Create a flex container for the template info
        const container = document.createElement('div');
        container.className = 'flex flex-col';

        // Template name
        const name = document.createElement('div');
        name.className = 'font-medium text-gray-800';
        name.textContent = template.name;
        container.appendChild(name);

        // Template description
        if (template.description) {
            const description = document.createElement('div');
            description.className = 'text-xs text-gray-500 mt-1';
            description.textContent = template.description;
            container.appendChild(description);
        }

        // Associated model info
        if (template.associatedModel) {
            const modelInfo = document.createElement('div');
            modelInfo.className = 'text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mt-2 inline-block';
            modelInfo.textContent = `Model: ${template.associatedModel.name}`;
            container.appendChild(modelInfo);
        }

        // Scope badge
        const scopeBadge = document.createElement('div');
        scopeBadge.className = 'text-xs rounded-full px-2 py-0.5 mt-2 inline-block';

        if (template.scope === 'private') {
            scopeBadge.classList.add('bg-purple-100', 'text-purple-800');
            scopeBadge.textContent = 'Private';
        } else {
            scopeBadge.classList.add('bg-green-100', 'text-green-800');
            scopeBadge.textContent = 'Organization';
        }

        container.appendChild(scopeBadge);
        item.appendChild(container);

        return item;
    }

    // Search functionality
    search() {
        console.log('Searching templates:', this.searchInputTarget.value);
        this.searchTermValue = this.searchInputTarget.value;
        this.renderTemplateList();
    }

    // Handle keyboard events in the search input
    handleSearchKeydown(event) {
        // Close dropdown on Escape
        if (event.key === 'Escape') {
            this.closeDropdown();
        }
        // Prevent form submission on Enter
        else if (event.key === 'Enter') {
            event.preventDefault();
            // If only one template matches the search, select it
            const searchTermLower = (this.searchTermValue || '').toLowerCase();
            const matches = this.templatesValue.filter(template =>
                template.name.toLowerCase().includes(searchTermLower) ||
                (template.description && template.description.toLowerCase().includes(searchTermLower))
            );

            if (matches.length === 1) {
                this.selectTemplate({ currentTarget: { dataset: { templateId: matches[0].id } } });
            }
        }
    }

    // Handle keyboard events globally
    handleKeyDown(event) {
        // Close dropdown when Escape key is pressed
        if (event.key === 'Escape' && this.isOpenValue) {
            console.log('Escape key pressed, closing dropdown');
            this.closeDropdown();
        }
    }

    // Handle clicks outside the component
    clickOutside(event) {
        // Only close if the dropdown is open and the click is outside the element
        if (this.isOpenValue && !this.element.contains(event.target)) {
            console.log('Click outside detected, closing dropdown');
            this.closeDropdown();
        }
    }

    // Toggle dropdown visibility
    toggleDropdown() {
        console.log('Toggle dropdown');
        this.isOpenValue = !this.isOpenValue;
        this.renderDropdownVisibility();
    }

    // Open dropdown
    openDropdown() {
        if (!this.isOpenValue) {
            console.log('Opening dropdown');
            this.isOpenValue = true;
            this.renderDropdownVisibility();
        }
    }

    // Close dropdown
    closeDropdown() {
        if (this.isOpenValue) {
            console.log('Closing dropdown');
            this.isOpenValue = false;
            this.renderDropdownVisibility();

            // Clear search input when closing
            if (this.hasSearchInputTarget) {
                this.searchInputTarget.value = '';
                this.searchTermValue = '';
                this.renderTemplateList();
            }
        }
    }

    // Update dropdown visibility based on isOpenValue
    renderDropdownVisibility() {
        if (!this.hasDropdownTarget) return;

        console.log(`Setting dropdown visibility: ${this.isOpenValue ? 'visible' : 'hidden'}`);
        this.dropdownTarget.hidden = !this.isOpenValue;
    }

    // Update the selected count display
    updateSelectedCount() {
        if (this.hasSelectedCountTarget) {
            const count = this.selectedTemplateIdValue ? 1 : 0;
            this.selectedCountTarget.textContent = `${count} selected`;
        }
    }

    // Render the selected template chip
    renderSelectedTemplate() {
        if (!this.hasSelectedTemplateContainerTarget) return;

        const container = this.selectedTemplateContainerTarget;
        container.innerHTML = '';

        if (!this.selectedTemplateIdValue) return;

        const template = this.templatesValue.find(t => t.id === this.selectedTemplateIdValue);
        if (!template) return;

        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 shadow-sm';

        chip.innerHTML = `
            <span class="mr-1 font-semibold">${template.name}</span>
            ${template.associatedModel ? `<span class="mr-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Model: ${template.associatedModel.name}</span>` : ''}
            <button type="button" data-action="click->template-selector#clearTemplate" class="ml-2 text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        `;

        container.appendChild(chip);
    }

    selectTemplate(event) {
        const templateId = parseInt(event.currentTarget.dataset.templateId, 10);
        const template = this.templatesValue.find(t => t.id === templateId);

        if (!template) {
            console.error('Template not found:', templateId);
            return;
        }

        console.log('Template selected:', template.name);
        this.selectedTemplateIdValue = templateId;

        // Close the dropdown
        this.closeDropdown();

        // Clear search input
        if (this.hasSearchInputTarget) {
            this.searchInputTarget.value = '';
            this.searchTermValue = '';
        }

        // Get the associated model ID if available - with detailed logging
        let associatedModelId = null;
        console.log('Template object:', template);
        console.log('Template associated model:', template.associatedModel);

        if (template.associatedModel && template.associatedModel.modelId) {
            associatedModelId = template.associatedModel.modelId;
            console.log('Template has associated model:', associatedModelId);
            console.log('Associated model ID type:', typeof associatedModelId);
            console.log('Associated model ID length:', associatedModelId.length);
            // Log each character code to check for hidden characters
            console.log('Character codes:', [...associatedModelId].map(c => c.charCodeAt(0)));
        } else if (template.associatedModel) {
            console.log('Template has associated model but no modelId property');
            // Try to find any property that might contain the model ID
            console.log('Available properties:', Object.keys(template.associatedModel));
        }

        // Update the UI
        this.render();

        // Notify the chat controller about the selected template and its associated model
        if (this.hasChatOutlet) {
            this.chatOutlet.templateSelected({
                detail: {
                    templateId,
                    associatedModelId
                }
            });
        }
    }

    clearTemplate() {
        console.log('Clearing template selection');
        this.selectedTemplateIdValue = 0;

        // Update the UI
        this.render();

        // Notify the chat controller that the template has been cleared
        if (this.hasChatOutlet) {
            this.chatOutlet.templateSelected({ detail: { templateId: null, associatedModelId: null } });
        }
    }

    // Clean up event listeners when the controller is disconnected
    disconnect() {
        console.log('Template selector controller disconnected');
        document.removeEventListener('click', this.boundClickOutside);
        document.removeEventListener('keydown', this.boundKeyDown);
    }
}
