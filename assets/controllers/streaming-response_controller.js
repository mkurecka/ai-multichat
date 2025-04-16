import { Controller } from '@hotwired/stimulus';

/**
 * Controller for an individual assistant message element during streaming.
 * Handles updating the content of the message during streaming.
 */
export default class extends Controller {
    static targets = [
        "content" // The element where the streamed text is displayed
    ];

    static values = {
        promptId: String,
        modelId: String
    };

    connect() {
        console.log(`Streaming response controller connected for prompt ${this.promptIdValue}, model ${this.modelIdValue}`);
    }

    /**
     * Update the content of the message
     */
    updateContent(content) {
        if (this.hasContentTarget) {
            this.contentTarget.textContent = content;
        }
    }

    disconnect() {
        console.log(`Streaming response controller disconnected for prompt ${this.promptIdValue}, model ${this.modelIdValue}`);
    }
}
