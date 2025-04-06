import { Controller } from '@hotwired/stimulus';

/*
 * Controller for the chat input area.
 * Handles:
 * - Textarea input
 * - Enabling/disabling based on model selection and loading state
 * - Sending the message content to the parent chat controller on submit (Enter or button click)
 * - Clearing the input after sending
 */
export default class extends Controller {
    static targets = [
        "textarea", // The textarea element
        "submitButton" // The send button
    ];

    static values = {
        disabled: Boolean, // Controls the disabled state
        isLoading: Boolean // Tracks if the parent controller is processing a message
    };

    static outlets = ['chat']; // Outlet to communicate with the main chat controller

    connect() {
        console.log('Chat input connected');

        // Check if we have a chat outlet and get the current model selection
        if (this.hasChatOutlet && this.chatOutlet.selectedModelIdsValue) {
            console.log('Chat outlet connected, checking model selection');
            const selectedIds = this.chatOutlet.selectedModelIdsValue;
            this.disabledValue = selectedIds.length === 0;
            console.log(`Initial model selection: ${selectedIds.length} models selected`);
        } else {
            console.log('No chat outlet or no models selected yet');
            this.disabledValue = true;
        }

        this.updateState(); // Set initial state

        // Add a timeout to check model selection after a delay
        setTimeout(() => {
            this.checkModelSelection();
        }, 1000);

        // Set up a periodic check for model selection
        this.modelCheckInterval = setInterval(() => {
            this.checkModelSelection();
        }, 2000); // Check every 2 seconds
    }

    // Listen for updates from the parent chat controller
    chatModelSelectionUpdated({ detail: { selectedIds } }) {
        console.log(`Model selection updated: ${selectedIds.length} models selected`);
        this.disabledValue = selectedIds.length === 0;
        this.updateState();

        // Log the current state
        console.log(`Chat input state after model selection update: disabled=${this.disabledValue}, loading=${this.isLoadingValue}`);
    }

    chatSendStart() {
        this.isLoadingValue = true;
        this.updateState();
    }

    chatSendEnd() {
        this.isLoadingValue = false;
        this.updateState();
        this.textareaTarget.focus(); // Re-focus after sending
    }

    updateState() {
        const isDisabled = this.disabledValue || this.isLoadingValue;
        const hasContent = this.textareaTarget.value.trim() !== '';

        // Always disable if no models selected or loading
        this.textareaTarget.disabled = isDisabled;
        this.submitButtonTarget.disabled = isDisabled || !hasContent;

        // Update visual state
        if (isDisabled) {
            // Different messages based on state
            if (this.isLoadingValue) {
                this.textareaTarget.placeholder = "Generating response...";
            } else {
                this.textareaTarget.placeholder = "⚠️ Select at least one model to start chatting";
            }

            // Disabled styling
            this.textareaTarget.classList.add('bg-gray-100', 'text-gray-500', 'border-gray-300');
            this.submitButtonTarget.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            this.submitButtonTarget.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');

            // Add a red border if specifically disabled due to no models (not loading)
            if (this.disabledValue && !this.isLoadingValue) {
                this.textareaTarget.classList.add('border-red-300');
                this.element.classList.add('opacity-80'); // Dim the whole input area
            } else {
                this.textareaTarget.classList.remove('border-red-300');
                this.element.classList.remove('opacity-80');
            }
        } else {
            // Enabled state
            this.textareaTarget.placeholder = "Type your message here...";
            this.textareaTarget.classList.remove('bg-gray-100', 'text-gray-500', 'border-red-300', 'border-gray-300');
            this.element.classList.remove('opacity-80');

            // Button state depends on content
            if (hasContent) {
                this.submitButtonTarget.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
                this.submitButtonTarget.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            } else {
                this.submitButtonTarget.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
                this.submitButtonTarget.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            }
        }
    }

    // Called when the textarea value changes
    onInput() {
        // Check model selection and update disabled state
        this.checkModelSelection();

        // Re-evaluate button disabled state based on content
        this.updateState();

        // Auto-resize textarea (optional)
        this.resizeTextarea();
    }

    resizeTextarea() {
        this.textareaTarget.style.height = 'auto'; // Reset height
        this.textareaTarget.style.height = `${this.textareaTarget.scrollHeight}px`;
    }

    submit(event) {
        event.preventDefault();
        const prompt = this.textareaTarget.value.trim();

        console.log('Attempting to submit message...');
        console.log(`Current state: disabled=${this.disabledValue}, loading=${this.isLoadingValue}, hasOutlet=${this.hasChatOutlet}`);

        // Check if we have a chat outlet and get the current model selection
        if (this.hasChatOutlet && this.chatOutlet.selectedModelIdsValue) {
            const selectedIds = this.chatOutlet.selectedModelIdsValue;
            console.log(`Current model selection: ${selectedIds.length} models selected`);

            // Update disabled state based on current model selection
            if (selectedIds.length > 0 && this.disabledValue) {
                console.log('Models are selected but input is disabled, enabling input');
                this.disabledValue = false;
                this.updateState();
            }
        }

        // Double-check that we have models selected and are not disabled
        if (this.disabledValue) {
            console.warn('Cannot send message: Input is disabled');
            return;
        }

        if (this.isLoadingValue) {
            console.warn('Cannot send message: Already processing a request');
            return;
        }

        if (!this.hasChatOutlet) {
            console.error('Cannot send message: Chat outlet not connected');
            return;
        }

        if (!prompt) {
            console.warn('Cannot send empty message');
            return;
        }

        console.log('Dispatching send message event');
        // Dispatch event to the main chat controller
        this.chatOutlet.handleSendMessage({ detail: { prompt } });
        this.textareaTarget.value = ''; // Clear the textarea
        this.resizeTextarea(); // Reset size
        this.updateState(); // Update button state
    }

    // Handle Enter key press (Shift+Enter for newline)
    keydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submit(event);
        }
    }

    // Method to check model selection and update disabled state
    checkModelSelection() {
        console.log('Checking model selection...');
        if (this.hasChatOutlet && this.chatOutlet.selectedModelIdsValue) {
            const selectedIds = this.chatOutlet.selectedModelIdsValue;
            console.log(`Current model selection: ${selectedIds.length} models selected`);

            // Update disabled state based on current model selection
            const shouldBeDisabled = selectedIds.length === 0;
            if (this.disabledValue !== shouldBeDisabled) {
                console.log(`Updating disabled state: ${this.disabledValue} -> ${shouldBeDisabled}`);
                this.disabledValue = shouldBeDisabled;
                this.updateState();
            }

            return selectedIds.length > 0;
        }

        return false;
    }

    // Clean up when the controller is disconnected
    disconnect() {
        console.log('Chat input disconnected');
        if (this.modelCheckInterval) {
            clearInterval(this.modelCheckInterval);
        }
    }
}
