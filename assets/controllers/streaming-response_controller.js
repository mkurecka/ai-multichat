import { Controller } from '@hotwired/stimulus';

/*
 * Controller for an individual assistant message element during streaming.
 * Currently, the main 'chat' controller finds and updates the content directly.
 * This controller exists as a placeholder in case more complex per-message
 * logic (e.g., animations, markdown parsing during stream) is needed later.
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
        // console.log(`Streaming response controller connected for prompt ${this.promptIdValue}, model ${this.modelIdValue}`);
    }

    // Example method if the chat controller dispatched events instead:
    // handleChunk({ detail: { contentChunk } }) {
    //     if (this.hasContentTarget) {
    //         // Append or replace logic here
    //         this.contentTarget.textContent = contentChunk; // Simple replacement
    //     }
    // }

    disconnect() {
        // console.log(`Streaming response controller disconnected for prompt ${this.promptIdValue}, model ${this.modelIdValue}`);
    }
}
