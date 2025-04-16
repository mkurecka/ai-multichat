import { Controller } from '@hotwired/stimulus';
import Sortable from 'sortablejs';

/*
 * Basic Stimulus controller to handle Symfony Form Collections.
 *
 * Requires the CollectionType field to have specific data attributes:
 * - data-controller="form-collection"
 * - data-form-collection-add-label-value="Add Item" (Optional: Text for add button)
 * - data-form-collection-delete-label-value="Remove" (Optional: Text/HTML for remove button)
 *
 * The collection container within the widget should have:
 * - data-form-collection-target="collectionContainer"
 *
 * Each row within the container should have class:
 * - form-collection-row (or similar for targeting)
 *
 * Add/Remove buttons should have actions:
 * - data-action="form-collection#add"
 * - data-action="form-collection#remove" (within each row)
 *
 * Assumes the hidden sortOrder input has class 'prompt-template-message-sort-order'.
 */
export default class extends Controller {
    // Add 'prototype' to targets
    static targets = ['collectionContainer', 'prototype'];
    static values = {
        addLabel: String,
        deleteLabel: String,
        // Remove prototype value, we'll use the target now
        // prototype: String,
        prototype: String, // Automatically handled by ux-form-collection if installed, otherwise needs manual setup
    }

    #sortable = null;

    connect() {
        // Check if the prototype target exists and log its content
        if (this.hasPrototypeTarget) {
            console.log('Controller connected. Prototype target found. Content:', this.prototypeTarget.innerHTML);
        } else {
            console.warn('Controller connected. Prototype target NOT found.');
        }

        this.#updateIndices(); // Initial index update
        this.#initializeSortable(); // Initialize drag-and-drop
    }

    disconnect() {
        if (this.#sortable) {
            this.#sortable.destroy();
        }
    }

    add(event) {
        event.preventDefault();

        // Try to get the prototype HTML from multiple sources
        let prototypeHtml = null;

        // First check if we have a prototype target
        if (this.hasPrototypeTarget) {
            // Try to get the prototype from the template innerHTML
            if (this.prototypeTarget.tagName === 'TEMPLATE' && this.prototypeTarget.innerHTML) {
                prototypeHtml = this.prototypeTarget.innerHTML;
                console.log('Found prototype in template innerHTML');
            }
            // If not in innerHTML, try the data-prototype attribute
            else if (this.prototypeTarget.getAttribute('data-prototype')) {
                prototypeHtml = this.prototypeTarget.getAttribute('data-prototype');
                console.log('Found prototype in data-prototype attribute');
            }
            // Look for a nearby element with data-prototype
            else {
                const prototypeElement = this.element.querySelector('[data-prototype]');
                if (prototypeElement) {
                    prototypeHtml = prototypeElement.getAttribute('data-prototype');
                    console.log('Found prototype in nearby element');
                }
            }
        } else {
            // If no prototype target, look for any element with data-prototype
            const prototypeElement = this.element.querySelector('[data-prototype]');
            if (prototypeElement) {
                prototypeHtml = prototypeElement.getAttribute('data-prototype');
                console.log('Found prototype in element with data-prototype');
            }
        }

        console.log('Attempting to add item. Prototype HTML found:', prototypeHtml ? 'Yes' : 'No');

        if (!prototypeHtml) {
            console.error('Cannot add item: prototype not found in any expected location');
            alert('Error: Cannot add new message. Form configuration issue (prototype not found).');
            return;
        }

        // Find the container element using the target
        if (!this.hasCollectionContainerTarget) {
             console.error('Cannot add item: collection container target not found.');
             alert('Error: Cannot add new message. Form structure issue (container target).');
             return;
        }
        const container = this.collectionContainerTarget;

        // Determine the next index based on direct children of the container with the form-collection-row class
        const count = container.querySelectorAll('.form-collection-row').length;
        console.log(`Current item count: ${count}`);
        // Replace '__name__' placeholder in the prototype HTML with the new index
        const newHtml = prototypeHtml.replace(/__name__/g, count);

        // Create a temporary element to insert the new HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtml;

        // Get the new item - handle both direct child and nested structure
        let newItem = tempDiv.firstElementChild;

        // If the new item doesn't have the expected structure, wrap it
        if (!newItem || !newItem.classList.contains('form-collection-row')) {
            // Create a wrapper with the proper structure
            const wrapper = document.createElement('div');
            wrapper.className = 'form-collection-row bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm';

            // Create the grid structure for role and content
            const gridDiv = document.createElement('div');
            gridDiv.className = 'grid grid-cols-1 md:grid-cols-12 gap-4';

            // Create columns for role and content
            const roleCol = document.createElement('div');
            roleCol.className = 'md:col-span-3';

            const contentCol = document.createElement('div');
            contentCol.className = 'md:col-span-9';

            // Find and move the role field
            const roleField = tempDiv.querySelector('[id$="_role"]')?.closest('.form-group, div');
            if (roleField) {
                roleCol.appendChild(roleField);
            } else {
                // If we can't find it specifically, just take the first part of the content
                roleCol.innerHTML = tempDiv.innerHTML;
                tempDiv.innerHTML = '';
            }

            // Find and move the content field
            const contentField = tempDiv.querySelector('[id$="_contentTemplate"]')?.closest('.form-group, div');
            if (contentField) {
                contentCol.appendChild(contentField);
            }

            // Find and move the sort order field
            const sortOrderField = tempDiv.querySelector('[id$="_sortOrder"]');
            if (sortOrderField) {
                contentCol.appendChild(sortOrderField);
            }

            // Add columns to the grid
            gridDiv.appendChild(roleCol);
            gridDiv.appendChild(contentCol);

            // Add the grid to the wrapper
            wrapper.appendChild(gridDiv);

            // Create the remove button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex justify-end mt-2';

            // Create the remove button
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-colors duration-200';
            removeButton.dataset.action = 'form-collection#delete';

            // Add the trash icon
            removeButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
            `;

            // Add the button to its container
            buttonContainer.appendChild(removeButton);

            // Add the button container to the wrapper
            wrapper.appendChild(buttonContainer);

            // Use the wrapper as our new item
            newItem = wrapper;
        } else {
            // The item already has the right structure, just add our classes
            newItem.classList.add('form-collection-row', 'bg-gray-50', 'p-4', 'rounded-md', 'border', 'border-gray-200', 'shadow-sm');
        }

        // Explicitly set the sortOrder on the new item *before* appending
        const sortOrderInput = newItem.querySelector('input[type="hidden"][id$="_sortOrder"]');
        if (sortOrderInput) {
            sortOrderInput.value = count; // Set initial sort order based on current count
            console.log(`Set initial sortOrder for new item to ${count}`);
        } else {
            console.warn('Could not find sortOrder input in new item prototype.');
        }

        // Append the new item to the found container
        container.appendChild(newItem);

        // Update indices for all items *after* appending the new one
        this.#updateIndices();
    }

    remove(event) {
        event.preventDefault();
        // Find the closest parent div that represents the item row
        // Use the form-collection-row class we added
        const item = event.target.closest('.form-collection-row');
        if (item) {
            // Add a fade-out animation before removing
            item.classList.add('opacity-50', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                item.remove();
                this.#updateIndices(); // Update indices after removing
            }, 300);
        }
    }

    #updateIndices() {
        if (!this.hasCollectionContainerTarget) return;
        const container = this.collectionContainerTarget;

        // Select rows based on the class we added in Twig
        container.querySelectorAll('.form-collection-row').forEach((row, index) => {
            // Update the hidden sortOrder input value within this row
            const sortOrderInput = row.querySelector('input[type="hidden"][id$="_sortOrder"]'); // Find input ending with _sortOrder
            if (sortOrderInput) {
                sortOrderInput.value = index;
            }
            // Optional: Update labels or other elements containing the index if needed
            // Example: row.querySelectorAll('label').forEach(label => { ... });
        });
         console.log('Indices updated');
    }

    #initializeSortable() {
        if (this.hasCollectionContainerTarget) {
            const container = this.collectionContainerTarget;
            this.#sortable = Sortable.create(container, {
                animation: 150,
                // Target rows by the class we added in Twig
                handle: '.form-collection-row',
                ghostClass: 'bg-indigo-50 border-indigo-300',  // Class for the drop placeholder
                chosenClass: 'ring-2 ring-indigo-500 ring-opacity-50', // Class for the chosen item
                dragClass: 'opacity-75',    // Class for the dragging item
                onEnd: () => {
                    // Update the sortOrder hidden fields after dragging ends
                    this.#updateIndices();
                },
            });
        }
    }
}
