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

        // Check if we have models from the chat controller
        console.log('Initial models value:', this.modelsValue);

        // Add a timeout to check if models are loaded after a delay
        setTimeout(() => {
            console.log('Checking models after timeout');
            console.log('Models after timeout:', this.modelsValue);
            if (!this.modelsValue || this.modelsValue.length === 0) {
                console.log('No models loaded after timeout, fetching directly');
                this.fetchModelsDirectly();
            }
        }, 2000);
    }

    disconnect() {
        document.removeEventListener('click', this.boundClickOutside);
        document.removeEventListener('keydown', this.boundKeyDown);
        console.log('Model selector disconnected');
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
        this.selectedIdsValue = selectedIds;
        // Update the internal 'selected' state of modelsValue
        this.modelsValue = this.modelsValue.map(model => ({
            ...model,
            selected: selectedIds.includes(model.id)
        }));
        this.render(); // Re-render with new selections
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
        }

        selectedModels.forEach(model => {
                const chip = document.createElement('div');
                chip.classList.add('inline-flex', 'items-center', 'px-3', 'py-2', 'mb-2', 'mr-2', 'rounded-lg', 'text-sm', 'font-medium', 'bg-blue-100', 'text-blue-800', 'border', 'border-blue-300');
                chip.innerHTML = `
                    <span class="mr-1">${model.name}</span>
                    ${model.supportsStreaming ? `<span class="mr-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Streaming</span>` : ''}
                    <button type="button" data-action="click->model-selector#toggleModel" data-model-id="${model.id}" class="ml-2 text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                `;
                fragment.appendChild(chip);
            });

        this.selectedChipContainerTarget.appendChild(fragment);

        // Add a hint to reopen the dropdown if models are selected
        if (selectedModels.length > 0) {
            const hint = document.createElement('div');
            hint.classList.add('w-full', 'text-xs', 'text-gray-500', 'mt-1');
            hint.textContent = 'Click the Models button to add more models';
            this.selectedChipContainerTarget.appendChild(hint);
        }
    }

    // Method to directly fetch models if they're not loaded from the chat controller
    async fetchModelsDirectly() {
        console.log('Fetching models directly from model-selector controller');
        try {
            // Try to get from localStorage first
            const cachedModels = localStorage.getItem('stimulus_models');
            if (cachedModels) {
                console.log('Using cached models from localStorage');
                const models = JSON.parse(cachedModels);
                this.modelsValue = models.map(m => ({ ...m, selected: false }));
                this.render();
                return models;
            }

            // If not in localStorage, fetch from API
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const models = await response.json();
            console.log(`Fetched ${models.length} models directly:`, models);

            // Store in localStorage for future use
            localStorage.setItem('stimulus_models', JSON.stringify(models));

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
