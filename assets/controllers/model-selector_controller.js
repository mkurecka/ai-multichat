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
        this.updateSelectedCount();

        // Add listener to close dropdown when clicking outside
        this.boundClickOutside = this.clickOutside.bind(this);
        document.addEventListener('click', this.boundClickOutside);
    }

    disconnect() {
        document.removeEventListener('click', this.boundClickOutside);
        console.log('Model selector disconnected');
    }

    // Listener for the parent chat controller loading models
    chatModelsLoaded({ detail: { models } }) {
        console.log('Received models from chat controller:', models.length);
        // Initialize selection state based on potentially pre-selected models (e.g., from loaded chat)
        const initialSelectedIds = models.filter(m => m.selected).map(m => m.id);
        this.modelsValue = models.map(m => ({ ...m, selected: initialSelectedIds.includes(m.id) }));
        this.selectedIdsValue = initialSelectedIds;
        this.render(); // Initial render
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
            this.isOpenValue = true;
            this.renderDropdownVisibility();
        }
    }

    closeDropdown() {
        if (this.isOpenValue) {
            this.isOpenValue = false;
            this.renderDropdownVisibility();
            this.searchInputTarget.blur(); // Remove focus from input
        }
    }

    clickOutside(event) {
        if (!this.element.contains(event.target)) {
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
        // Keep dropdown open after selection? Maybe close it? For now, keep open.
        // this.closeDropdown();
    }

    // --- Rendering Functions ---

    render() {
        console.log('Rendering model selector. Selected:', this.selectedIdsValue);
        this.renderModelList();
        this.renderSelectedChips();
        this.updateSelectedCount();
        this.renderDropdownVisibility();
    }

    renderDropdownVisibility() {
         this.dropdownTarget.hidden = !this.isOpenValue;
         // Add/remove classes for transitions if desired
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

        const searchTermLower = this.searchTermValue.toLowerCase();
        const filtered = this.modelsValue.filter(model =>
            model.name.toLowerCase().includes(searchTermLower)
        );

        this.modelListTarget.innerHTML = ''; // Clear existing items

        if (filtered.length === 0) {
            if (this.hasNoResultsMessageTarget) this.noResultsMessageTarget.hidden = false;
            return;
        }

        if (this.hasNoResultsMessageTarget) this.noResultsMessageTarget.hidden = true;

        const fragment = document.createDocumentFragment();
        const canSelectMore = this.selectedIdsValue.length < this.maxModelsValue;

        filtered.forEach(model => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.modelId = model.id;
            button.dataset.action = 'click->model-selector#toggleModel';
            button.classList.add('w-full', 'text-left', 'px-3', 'py-2', 'rounded-md', 'text-sm', 'transition-colors');

            const isSelected = this.selectedIdsValue.includes(model.id);
            button.disabled = !isSelected && !canSelectMore;

            if (isSelected) {
                button.classList.add('bg-blue-100', 'text-blue-800', 'hover:bg-blue-200');
            } else {
                button.classList.add('text-gray-700', 'hover:bg-gray-100');
                if (button.disabled) {
                     button.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }

            // Basic structure (adapt based on React component's details)
            button.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span>${model.name}</span>
                        ${model.supportsStreaming ? `<span class="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Streaming</span>` : ''}
                    </div>
                    ${isSelected ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` : ''}
                </div>
            `;
            // Add the 'modelItem' target dynamically if needed for styling/selection
            button.setAttribute('data-model-selector-target', 'modelItem');
            fragment.appendChild(button);
        });

        this.modelListTarget.appendChild(fragment);
    }

    renderSelectedChips() {
        if (!this.hasSelectedChipContainerTarget) return;

        this.selectedChipContainerTarget.innerHTML = ''; // Clear existing chips
        const fragment = document.createDocumentFragment();

        this.modelsValue
            .filter(model => this.selectedIdsValue.includes(model.id))
            .forEach(model => {
                const chip = document.createElement('div');
                chip.classList.add('inline-flex', 'items-center', 'px-3', 'py-1', 'rounded-full', 'text-sm', 'font-medium', 'bg-blue-100', 'text-blue-800');
                chip.innerHTML = `
                    ${model.name}
                    <button type="button" data-action="click->model-selector#toggleModel" data-model-id="${model.id}" class="ml-2 text-blue-600 hover:text-blue-800">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                `;
                fragment.appendChild(chip);
            });

        this.selectedChipContainerTarget.appendChild(fragment);
    }
}
