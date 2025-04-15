import { Controller } from '@hotwired/stimulus';

/*
 * Controller for the model selection component.
 * Handles:
 * - Displaying available models
 * - Filtering models based on search input
 * - Toggling model selection state
 * - Enforcing maximum selected models limit
 * - Displaying selected models as chips
 * - Communicating selection changes to the parent chat controller
 */
export default class extends Controller {
    static targets = [
        "searchInput",      // Input field for searching models
        "dropdown",         // The dropdown container for model list
        "modelList",        // The UL or Div containing the list of models
        "modelItem",        // Individual model item/button in the dropdown (repeated)
        "selectedChipContainer", // Container for displaying selected model chips
        "selectedCount",    // Span to display "X/Y selected"
        "noResultsMessage", // Message shown when search yields no results
        "maxReachedMessage" // Message/indicator when max models are selected
    ];

    static values = {
        models: Array,      // Full list of models {id, name, selected, ...}
        selectedIds: Array, // Array of currently selected model IDs
        maxModels: Number,  // Maximum number of models allowed
        isOpen: Boolean,    // State of the dropdown
        searchTerm: String  // Current search term
    };

    static outlets = ['chat']; // Outlet to communicate with the main chat controller

    connect() {
        console.log('Model selector connected');
        this.isOpenValue = false; // Start closed
        this._initialDropdownShown = false; // Flag to track if dropdown has been shown initially
        this.updateSelectedCount();

        // Add listener to close dropdown when clicking outside
        this.boundClickOutside = this.clickOutside.bind(this);
        document.addEventListener('click', this.boundClickOutside);

        // Add keyboard listener for Escape key to close dropdown
        this.boundKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.boundKeyDown);

        // Add listener for the custom event from the chat controller
        this.boundHandleSetSelectedModels = this.handleSetSelectedModels.bind(this);
        this.element.addEventListener('chat:setSelectedModels', this.boundHandleSetSelectedModels);

        // Also add a global document listener to ensure we catch the event
        document.addEventListener('chat:setSelectedModels', this.boundHandleSetSelectedModels);

        // Check if we have models from the chat controller
        console.log('Model selector ID:', this.element.id);
        console.log('Initial models value:', this.modelsValue);

        // Add a timeout to check if models are loaded after a delay
        setTimeout(() => {
            console.log('Checking models after timeout');
            console.log('Models after timeout:', this.modelsValue);
            if (!this.modelsValue || this.modelsValue.length === 0) {
                console.log('No models loaded after timeout, fetching directly');
                this.fetchModelsDirectly();
            }
        }, 1000);
    }

    disconnect() {
        document.removeEventListener('click', this.boundClickOutside);
        document.removeEventListener('keydown', this.boundKeyDown);
        this.element.removeEventListener('chat:setSelectedModels', this.boundHandleSetSelectedModels);
        document.removeEventListener('chat:setSelectedModels', this.boundHandleSetSelectedModels);
        console.log('Model selector disconnected');
    }

    // Fetch models directly from the API if they're not provided by the chat controller
    async fetchModelsDirectly() {
        console.log('Fetching models directly from API');
        try {
            const response = await fetch('/api/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Models fetched directly:', data);

            if (data && Array.isArray(data)) {
                this.modelsValue = data;
                this.render();

                // Check if we have a pending model selection from a template
                if (this.hasChatOutlet && this.chatOutlet._pendingAssociatedModelId) {
                    console.log('Found pending model selection, applying it now');
                    this.chatOutlet._selectAssociatedModel(this.chatOutlet._pendingAssociatedModelId);
                }
            }
        } catch (error) {
            console.error('Error fetching models directly:', error);
        }
    }

    // Handler for the custom event from the chat controller
    handleSetSelectedModels(event) {
        console.log('Received custom setSelectedModels event:', event.detail);
        const { selectedIds } = event.detail;

        if (!selectedIds) {
            console.log('Invalid selectedIds from custom event');
            return;
        }

        // If empty array is received, clear the selection
        if (selectedIds.length === 0) {
            console.log('Clearing model selection from custom event');
            this.clearSelection();
            return;
        }

        // Use the same logic as chatSetSelectedModels for non-empty arrays
        this.chatSetSelectedModels({ detail: { selectedIds } });
    }

    // Handle keyboard events
    handleKeyDown(event) {
        // Close dropdown when Escape key is pressed
        if (event.key === 'Escape' && this.isOpenValue) {
            console.log('Escape key pressed, closing dropdown');
            this.closeDropdown();
        }
    }

    // Listener for the parent chat controller loading models
    chatModelsLoaded({ detail: { models } }) {
        console.log('Received models from chat controller:', models);
        if (!models || models.length === 0) {
            console.warn('Received empty models array from chat controller');
            // Try fetching directly if we received an empty array
            this.fetchModelsDirectly();
            return;
        }

        console.log(`Received ${models.length} models from chat controller`);
        // Initialize selection state based on potentially pre-selected models (e.g., from loaded chat)
        const initialSelectedIds = models.filter(m => m.selected).map(m => m.id);
        this.modelsValue = models.map(m => ({ ...m, selected: initialSelectedIds.includes(m.id) }));
        this.selectedIdsValue = initialSelectedIds;
        this.render(); // Initial render

        // Don't automatically open the dropdown
        // this.openDropdown();
    }

    // Listener for the parent chat controller setting selected models (e.g., when loading a chat)
    chatSetSelectedModels({ detail: { selectedIds } }) {
        console.log('Received selected IDs from chat controller:', selectedIds);

        // If selectedIds is undefined or null, return
        if (!selectedIds) {
            console.log('Invalid selectedIds from chat controller');
            return;
        }

        // If empty array is received, clear the selection
        if (selectedIds.length === 0) {
            console.log('Clearing model selection from chat controller');
            this.clearSelection();
            return;
        }

        // Validate that the selected IDs exist in our models list
        const validSelectedIds = selectedIds.filter(id =>
            this.modelsValue.some(model => model.id === id)
        );

        if (validSelectedIds.length === 0) {
            console.warn('None of the selected IDs exist in the models list');
            return;
        }

        console.log('Setting selected models to:', validSelectedIds);
        this.selectedIdsValue = validSelectedIds;

        // Update the internal 'selected' state of modelsValue
        this.modelsValue = this.modelsValue.map(model => ({
            ...model,
            selected: validSelectedIds.includes(model.id)
        }));

        // Force update the selectedIdsValue attribute to ensure it's reflected in the DOM
        this.element.setAttribute('data-model-selector-selected-ids-value', JSON.stringify(validSelectedIds));

        // Notify parent controller about the selection
        if (this.hasChatOutlet) {
            console.log('Notifying chat controller about model selection change');
            this.chatOutlet.handleModelSelectionChange({ detail: { selectedIds: this.selectedIdsValue } });
        }

        this.render(); // Re-render with new selections

        // Show a notification to indicate which models were selected
        const modelNames = this.modelsValue
            .filter(model => validSelectedIds.includes(model.id))
            .map(model => model.name)
            .join(', ');

        console.log(`Selected models: ${modelNames}`);
    }

    // Handle the setSelectedModels event from the chat controller
    handleSetSelectedModels(event) {
        console.log('Received setSelectedModels event:', event);
        const { selectedIds } = event.detail || {};

        if (!selectedIds) {
            console.warn('No selectedIds in setSelectedModels event');
            return;
        }

        console.log('Setting selected models from event:', selectedIds);

        // Convert model IDs (strings) to model database IDs (numbers)
        const modelDbIds = [];

        // Debug: Log all available models
        console.log('Available models in model selector:', this.modelsValue.map(m => ({ id: m.id, modelId: m.modelId, name: m.name })));

        for (const modelId of selectedIds) {
            // Try exact match first
            let model = this.modelsValue.find(m => m.modelId === modelId);

            // If no exact match, try a more flexible match
            if (!model) {
                try {
                    // Try to match by base model name (without version)
                    const baseModelId = modelId.split('-').slice(0, -1).join('-');
                    console.log('Trying to match with base model ID:', baseModelId);

                    // Try to find a model that starts with the base model ID
                    // Make sure both modelId and baseModelId exist before using startsWith
                    if (baseModelId) {
                        model = this.modelsValue.find(m => m.modelId && m.modelId.startsWith(baseModelId));
                    }

                    if (model) {
                        console.log('Found similar model:', model.modelId);
                    }
                } catch (error) {
                    console.error('Error while trying to match model:', error);
                }
            }

            if (model) {
                modelDbIds.push(model.id);
            } else {
                console.warn(`Model with modelId ${modelId} not found`);
            }
        }

        if (modelDbIds.length === 0) {
            console.warn('No valid model IDs found');
            return;
        }

        // Use the chatSetSelectedModels method to update the selection
        this.chatSetSelectedModels({ detail: { selectedIds: modelDbIds } });
    }

    search() {
        this.searchTermValue = this.searchInputTarget.value;
        this.renderModelList(); // Re-render just the list based on search
    }

    toggleDropdown() {
        this.isOpenValue = !this.isOpenValue;
        this.renderDropdownVisibility();
    }

    openDropdown() {
        if (!this.isOpenValue) {
            console.log('Opening model dropdown');
            this.isOpenValue = true;
            this.renderDropdownVisibility();

            // Make sure the dropdown is properly positioned
            if (this.hasDropdownTarget && this.hasSearchInputTarget) {
                // Get the parent container for proper width
                const containerRect = this.element.getBoundingClientRect();

                // Position the dropdown below the search input
                const inputRect = this.searchInputTarget.getBoundingClientRect();

                // Use the container width instead of just the input width
                this.dropdownTarget.style.width = `${containerRect.width}px`;
                this.dropdownTarget.style.top = `${inputRect.bottom + window.scrollY + 5}px`; // Add a small gap
                this.dropdownTarget.style.left = `${containerRect.left + window.scrollX}px`;

                // Ensure the dropdown is visible
                this.dropdownTarget.classList.add('block');
                this.dropdownTarget.classList.remove('hidden');

                // Focus the search input for immediate typing
                this.searchInputTarget.focus();
            }
        }
    }

    closeDropdown() {
        if (this.isOpenValue) {
            console.log('Closing model dropdown');
            this.isOpenValue = false;
            this.renderDropdownVisibility();
            this.searchInputTarget.blur(); // Remove focus from input

            // Ensure the dropdown is hidden
            if (this.hasDropdownTarget) {
                this.dropdownTarget.hidden = true;
                this.dropdownTarget.classList.add('hidden');
                this.dropdownTarget.classList.remove('block');
            }
        }
    }

    // Method to clear all selected models
    clearSelection() {
        console.log('Clearing all selected models');
        this.selectedIdsValue = [];

        // Update the internal 'selected' state of modelsValue
        this.modelsValue = this.modelsValue.map(model => ({
            ...model,
            selected: false
        }));

        // Force update the selectedIdsValue attribute to ensure it's reflected in the DOM
        this.element.setAttribute('data-model-selector-selected-ids-value', JSON.stringify([]));

        // Notify parent controller about the selection change
        if (this.hasChatOutlet) {
            console.log('Notifying chat controller about cleared model selection');
            this.chatOutlet.handleModelSelectionChange({ detail: { selectedIds: [] } });
        }

        this.render(); // Re-render with cleared selections
    }

    clickOutside(event) {
        // Only close if the dropdown is open and the click is outside the element
        if (this.isOpenValue && !this.element.contains(event.target)) {
            console.log('Click outside detected, closing dropdown');
            this.closeDropdown();
        }
    }

    toggleModel(event) {
        const modelId = event.currentTarget.dataset.modelId;
        if (!modelId) return;

        const isSelected = this.selectedIdsValue.includes(modelId);
        const currentCount = this.selectedIdsValue.length;

        let newSelectedIds;

        if (isSelected) {
            // Deselect
            newSelectedIds = this.selectedIdsValue.filter(id => id !== modelId);
        } else {
            // Select - check limit
            if (currentCount >= this.maxModelsValue) {
                console.warn(`Cannot select model ${modelId}, maximum (${this.maxModelsValue}) reached.`);
                // Optionally show a message to the user
                return; // Do nothing
            }
            newSelectedIds = [...this.selectedIdsValue, modelId];
        }

        this.selectedIdsValue = newSelectedIds;

        // Update the internal 'selected' state of modelsValue
        this.modelsValue = this.modelsValue.map(model => ({
            ...model,
            selected: this.selectedIdsValue.includes(model.id)
        }));

        // Notify parent controller
        if (this.hasChatOutlet) {
            this.chatOutlet.handleModelSelectionChange({ detail: { selectedIds: this.selectedIdsValue } });
        }

        this.render(); // Re-render the component

        // Close the dropdown after selection to allow user to continue with other actions
        this.closeDropdown();

        // Log the selection
        console.log(`Model ${modelId} ${isSelected ? 'deselected' : 'selected'}. Current selection:`, this.selectedIdsValue);
    }

    // --- Rendering Functions ---

    render() {
        console.log('Rendering model selector. Selected:', this.selectedIdsValue);
        console.log('Models available for rendering:', this.modelsValue.length);
        this.renderModelList();
        this.renderSelectedChips();
        this.updateSelectedCount();
        this.renderDropdownVisibility();

        // Don't automatically open the dropdown on initial load
        // User must explicitly click the Models button to open it
        this._initialDropdownShown = true; // Set flag to prevent auto-opening
    }

    renderDropdownVisibility() {
        if (!this.hasDropdownTarget) return;

        console.log(`Setting dropdown visibility: ${this.isOpenValue ? 'visible' : 'hidden'}`);
        this.dropdownTarget.hidden = !this.isOpenValue;

        // Add/remove classes for better visibility control
        if (this.isOpenValue) {
            this.dropdownTarget.classList.add('block');
            this.dropdownTarget.classList.remove('hidden');
        } else {
            this.dropdownTarget.classList.add('hidden');
            this.dropdownTarget.classList.remove('block');
        }
    }

    updateSelectedCount() {
        const count = this.selectedIdsValue.length;
        if (this.hasSelectedCountTarget) {
            this.selectedCountTarget.textContent = `${count}/${this.maxModelsValue} selected`;
        }
        if (this.hasMaxReachedMessageTarget) {
             this.maxReachedMessageTarget.hidden = count < this.maxModelsValue;
        }
    }

    renderModelList() {
        if (!this.hasModelListTarget) return;

        const searchTermLower = (this.searchTermValue || '').toLowerCase();
        const filtered = this.modelsValue.filter(model =>
            model.name.toLowerCase().includes(searchTermLower)
        );

        this.modelListTarget.innerHTML = ''; // Clear existing items

        if (filtered.length === 0) {
            if (this.hasNoResultsMessageTarget) {
                this.noResultsMessageTarget.hidden = false;
                this.noResultsMessageTarget.textContent = this.modelsValue.length > 0
                    ? 'No models match your search'
                    : 'No models available';
            }
            return;
        }

        if (this.hasNoResultsMessageTarget) this.noResultsMessageTarget.hidden = true;

        const fragment = document.createDocumentFragment();
        const canSelectMore = this.selectedIdsValue.length < this.maxModelsValue;

        // Add a header to show how many models are available
        const header = document.createElement('div');
        header.classList.add('text-sm', 'font-semibold', 'text-gray-700', 'mb-2', 'pb-2', 'border-b');
        header.textContent = `${filtered.length} models available`;
        fragment.appendChild(header);

        filtered.forEach(model => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.modelId = model.id;
            button.dataset.action = 'click->model-selector#toggleModel';
            button.classList.add('w-full', 'text-left', 'px-3', 'py-2', 'mb-1', 'rounded-md', 'text-sm', 'transition-colors', 'border');

            const isSelected = this.selectedIdsValue.includes(model.id);
            button.disabled = !isSelected && !canSelectMore;

            if (isSelected) {
                button.classList.add('bg-blue-100', 'text-blue-800', 'hover:bg-blue-200', 'border-blue-300');
            } else {
                button.classList.add('text-gray-700', 'hover:bg-gray-100', 'border-gray-300');
                if (button.disabled) {
                     button.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }

            // Enhanced structure with more details
            button.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="font-medium">${model.name}</span>
                        ${model.supportsStreaming ? `<span class="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Streaming</span>` : ''}
                    </div>
                    ${isSelected ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` : ''}
                </div>
                ${model.description ? `<div class="text-xs text-gray-500 mt-1">${model.description}</div>` : ''}
            `;
            // Add the 'modelItem' target dynamically if needed for styling/selection
            button.setAttribute('data-model-selector-target', 'modelItem');
            fragment.appendChild(button);
        });

        this.modelListTarget.appendChild(fragment);

        // Log that we've rendered the models
        console.log(`Rendered ${filtered.length} models in the dropdown`);
    }

    renderSelectedChips() {
        if (!this.hasSelectedChipContainerTarget) return;

        this.selectedChipContainerTarget.innerHTML = ''; // Clear existing chips
        const fragment = document.createDocumentFragment();

        // Add a header if models are selected
        const selectedModels = this.modelsValue.filter(model => this.selectedIdsValue.includes(model.id));
        if (selectedModels.length > 0) {
            const header = document.createElement('div');
            header.classList.add('w-full', 'text-sm', 'font-medium', 'text-gray-700', 'mb-2');
            header.textContent = 'Selected Models:';
            fragment.appendChild(header);

            // Add a container for the chips
            const chipsContainer = document.createElement('div');
            chipsContainer.classList.add('flex', 'flex-wrap', 'gap-2', 'mb-2');

            selectedModels.forEach(model => {
                const chip = document.createElement('div');
                chip.classList.add('inline-flex', 'items-center', 'px-3', 'py-2', 'rounded-lg', 'text-sm', 'font-medium', 'bg-blue-100', 'text-blue-800', 'border', 'border-blue-300', 'shadow-sm');

                // Add a highlight animation for newly selected models
                if (model.selected && !this._previouslySelectedIds?.includes(model.id)) {
                    chip.classList.add('animate-pulse-once');
                    setTimeout(() => {
                        chip.classList.remove('animate-pulse-once');
                    }, 2000);
                }

                chip.innerHTML = `
                    <span class="mr-1 font-semibold">${model.name}</span>
                    ${model.supportsStreaming ? `<span class="mr-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Streaming</span>` : ''}
                    <button type="button" data-action="click->model-selector#toggleModel" data-model-id="${model.id}" class="ml-2 text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                `;
                chipsContainer.appendChild(chip);
            });

            fragment.appendChild(chipsContainer);

            // Store the current selection for future reference
            this._previouslySelectedIds = [...this.selectedIdsValue];

            // Add a hint to reopen the dropdown if models are selected
            const hint = document.createElement('div');
            hint.classList.add('w-full', 'text-xs', 'text-gray-500', 'mt-1');
            hint.textContent = 'Click the Models button to add more models';
            fragment.appendChild(hint);
        } else {
            // If no models are selected, show a message
            const noModelsMessage = document.createElement('div');
            noModelsMessage.classList.add('text-sm', 'text-gray-500', 'italic');
            noModelsMessage.textContent = 'No models selected. Click the Models button to select models.';
            fragment.appendChild(noModelsMessage);
        }

        this.selectedChipContainerTarget.appendChild(fragment);
    }

    // Method to directly fetch models if they're not loaded from the chat controller
    async fetchModelsDirectly() {
        console.log('Fetching models directly from model-selector controller');
        try {
            // Fetch from API
            // This is the correct path since we're using fetch() directly
            // Add the Authorization header with the JWT token
            const token = localStorage.getItem('token');
            const response = await fetch('/api/models', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                // If we get a 401 Unauthorized error, it means the token is invalid or missing
                if (response.status === 401) {
                    console.error('401 Unauthorized: Authentication token is missing or invalid');
                    // Redirect to login if needed
                    // window.location.href = '/login';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const models = await response.json();
            console.log(`Fetched ${models.length} models directly:`, models);

            // Update the controller's models value and render
            this.modelsValue = models.map(m => ({ ...m, selected: false }));
            this.render();
            return models;
        } catch (error) {
            console.error('Error fetching models directly:', error);

            // Return some dummy models for testing if API fails
            console.log('Using dummy models as fallback');
            const dummyModels = [
                { id: 'model1', name: 'Model 1 (Fallback)', supportsStreaming: true },
                { id: 'model2', name: 'Model 2 (Fallback)', supportsStreaming: false },
                { id: 'model3', name: 'Model 3 (Fallback)', supportsStreaming: true }
            ];

            this.modelsValue = dummyModels.map(m => ({ ...m, selected: false }));
            this.render();
            return dummyModels;
        }
    }
}
