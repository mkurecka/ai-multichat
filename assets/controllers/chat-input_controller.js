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
        this.updateState(); // Set initial state
    }

    // Listen for updates from the parent chat controller
    chatModelSelectionUpdated({ detail: { selectedIds } }) {
        this.disabledValue = selectedIds.length === 0;
        this.updateState();
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
        this.textareaTarget.disabled = isDisabled;
        this.submitButtonTarget.disabled = isDisabled || this.textareaTarget.value.trim() === '';

        if (isDisabled) {
            this.textareaTarget.placeholder = this.isLoadingValue
                ? "Generating response..."
                : "Select at least one model to start chatting";
            this.textareaTarget.classList.add('bg-gray-100', 'text-gray-500');
            this.submitButtonTarget.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            this.submitButtonTarget.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
        } else {
            this.textareaTarget.placeholder = "Type your message here...";
            this.textareaTarget.classList.remove('bg-gray-100', 'text-gray-500');
            this.submitButtonTarget.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            this.submitButtonTarget.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
        }
    }

    // Called when the textarea value changes
    onInput() {
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

        if (prompt && !this.disabledValue && !this.isLoadingValue && this.hasChatOutlet) {
            console.log('Dispatching send message event');
            // Dispatch event to the main chat controller
            this.chatOutlet.handleSendMessage({ detail: { prompt } });
            this.textareaTarget.value = ''; // Clear the textarea
            this.resizeTextarea(); // Reset size
            this.updateState(); // Update button state
        }
    }

    // Handle Enter key press (Shift+Enter for newline)
    keydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submit(event);
        }
    }
}
