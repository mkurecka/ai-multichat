import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['toggle'];
    static values = {
        url: String,
        modelId: String
    };

    connect() {
        console.log('Model toggle controller connected');
    }

    async toggle(event) {
        event.preventDefault();
        const toggle = event.currentTarget;
        const modelId = this.modelIdValue;
        const url = this.urlValue;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({
                    modelId: modelId,
                    enabled: toggle.checked
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Model status updated successfully');
            } else {
                console.error('Failed to update model status:', data.error);
                toggle.checked = !toggle.checked; // Revert the toggle
            }
        } catch (error) {
            console.error('Error updating model status:', error);
            toggle.checked = !toggle.checked; // Revert the toggle
        }
    }
} 