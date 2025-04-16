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

        // Access the prototype HTML from the <template> target's innerHTML
        if (!this.hasPrototypeTarget) {
             console.error('Cannot add item: prototype target not found.');
             alert('Error: Cannot add new message. Form configuration issue (template target).');
             return;
        }
        const prototypeHtml = this.prototypeTarget.innerHTML;
        console.log('Attempting to add item. Prototype HTML found:', prototypeHtml ? 'Yes' : 'No', prototypeHtml); // Log prototype HTML

        if (!prototypeHtml) {
            console.error('Cannot add item: prototype template element is empty.');
            alert('Error: Cannot add new message. Form configuration issue (empty prototype).'); // User feedback
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
        const newItem = tempDiv.firstElementChild; // Assuming the prototype renders one main element

        // Add the form-collection-row class and Tailwind styling to the new item
        newItem.classList.add('form-collection-row', 'bg-gray-50', 'p-4', 'rounded-md', 'border', 'border-gray-200', 'shadow-sm');

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
