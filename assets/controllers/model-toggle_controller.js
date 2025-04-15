import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['toggle'];
    static values = {
        url: String,
        modelId: String,
        property: String,
        enabled: Boolean
    };

    connect() {
        console.log('Model toggle controller connected');
    }

    async toggle(event) {
        event.preventDefault();
        const toggle = event.currentTarget;
        const modelId = this.modelIdValue;
        const url = this.urlValue;
        const property = this.propertyValue || 'enabled';
        const isChecked = toggle.checked;

        // Get the dot element (sibling of the input)
        const dotElement = toggle.nextElementSibling.nextElementSibling;

        // Update visual state immediately for better UX
        if (isChecked) {
            dotElement.classList.add('translate-x-5', 'bg-blue-600');
        } else {
            dotElement.classList.remove('translate-x-5', 'bg-blue-600');
        }

        try {
            console.log(`Toggling ${property} for model ${modelId} to ${isChecked}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    modelId: modelId,
                    enabled: isChecked
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log(`Model ${property} updated successfully`);
                // No need to refresh the page, we've already updated the UI
            } else {
                console.error(`Failed to update model ${property}:`, data.error);
                // Revert the toggle visually
                toggle.checked = !isChecked;
                if (!isChecked) {
                    dotElement.classList.add('translate-x-5', 'bg-blue-600');
                } else {
                    dotElement.classList.remove('translate-x-5', 'bg-blue-600');
                }
            }
        } catch (error) {
            console.error(`Error updating model ${property}:`, error);
            // Revert the toggle visually
            toggle.checked = !isChecked;
            if (!isChecked) {
                dotElement.classList.add('translate-x-5', 'bg-blue-600');
            } else {
                dotElement.classList.remove('translate-x-5', 'bg-blue-600');
            }
        }
    }

    async toggleEnabled(event) {
        event.preventDefault();
        const modelId = this.modelIdValue;
        const currentlyEnabled = this.enabledValue;
        const newEnabledState = !currentlyEnabled;

        try {
            console.log(`Toggling enabled state for model ${modelId} to ${newEnabledState}`);

            const response = await fetch('/admin/models/toggle-enabled', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    modelId: modelId,
                    enabled: newEnabledState
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Model enabled state updated successfully');
                // Refresh the page to show updated state
                window.location.reload();
            } else {
                console.error('Failed to update model enabled state:', data.error);
            }
        } catch (error) {
            console.error('Error updating model enabled state:', error);
        }
    }
}