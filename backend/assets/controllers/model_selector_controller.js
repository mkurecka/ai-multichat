import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['modelList'];

    connect() {
        this.selectedModels = new Set();
        this.loadSelectedModels();
    }

    loadSelectedModels() {
        const selectedModels = localStorage.getItem('selectedModels');
        if (selectedModels) {
            this.selectedModels = new Set(JSON.parse(selectedModels));
            this.updateCheckboxes();
        }
    }

    updateCheckboxes() {
        this.modelListTarget.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = this.selectedModels.has(checkbox.value);
        });
    }

    toggleModel(event) {
        const checkbox = event.target;
        if (checkbox.checked) {
            this.selectedModels.add(checkbox.value);
        } else {
            this.selectedModels.delete(checkbox.value);
        }
        localStorage.setItem('selectedModels', JSON.stringify([...this.selectedModels]));
        this.dispatch('modelSelectionChanged', { detail: { selectedModels: [...this.selectedModels] } });
    }

    async refreshModels() {
        try {
            const response = await fetch('/api/models/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const models = await response.json();
                this.renderModels(models);
            } else {
                throw new Error('Failed to refresh models');
            }
        } catch (error) {
            console.error('Error refreshing models:', error);
            alert('Failed to refresh models. Please try again.');
        }
    }

    renderModels(models) {
        this.modelListTarget.innerHTML = models.map(model => `
            <div class="flex items-center space-x-2">
                <input type="checkbox" 
                       id="model-${model.id}" 
                       value="${model.id}"
                       class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                       data-action="change->model-selector#toggleModel"
                       ${this.selectedModels.has(model.id) ? 'checked' : ''}>
                <label for="model-${model.id}" class="text-sm text-gray-700">
                    ${model.name}
                </label>
            </div>
        `).join('');
    }
} 