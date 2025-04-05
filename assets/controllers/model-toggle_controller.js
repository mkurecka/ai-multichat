import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static values = {
        url: String
    }

    async toggle(event) {
        event.preventDefault();
        
        try {
            const response = await fetch(this.urlValue, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Update button state
            const button = event.currentTarget;
            const toggle = button.querySelector('span[aria-hidden="true"]');
            
            if (data.enabled) {
                button.classList.remove('bg-gray-200');
                button.classList.add('bg-indigo-600');
                button.setAttribute('aria-checked', 'true');
                toggle.classList.remove('translate-x-0');
                toggle.classList.add('translate-x-5');
            } else {
                button.classList.remove('bg-indigo-600');
                button.classList.add('bg-gray-200');
                button.setAttribute('aria-checked', 'false');
                toggle.classList.remove('translate-x-5');
                toggle.classList.add('translate-x-0');
            }
        } catch (error) {
            console.error('Error:', error);
            // You might want to show an error message to the user here
        }
    }
} 