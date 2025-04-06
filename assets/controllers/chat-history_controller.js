import { Controller } from '@hotwired/stimulus';

/*
 * Controller for the chat history sidebar.
 * Handles:
 * - Displaying the list of past chat sessions
 * - Handling selection of a chat session
 * - Handling the "Start New Chat" action
 * - Updating the list when history changes
 */
export default class extends Controller {
    static targets = [
        "listContainer", // UL or Div where session items are rendered
        "sessionItem",   // Individual session item (repeated)
        "newChatButton"  // Button to start a new chat
    ];

    static values = {
        chatHistory: Array, // Array of chat session objects {id, title, threadId, ...}
        currentThreadId: String // ID of the currently active thread
    };

    static outlets = ['chat']; // Outlet to communicate with the main chat controller

    connect() {
        console.log('Chat history connected');
        console.log('Outlets defined:', this.constructor.outlets);
        console.log('Chat outlet available:', this.hasChatOutlet);

        // Listen for the outletConnected event from the chat controller
        document.addEventListener('chat:outletConnected', this.handleOutletConnected.bind(this));

        // Add a timeout to check if the outlet connects after a delay
        setTimeout(() => {
            console.log('Checking chat outlet after timeout');
            console.log('Chat outlet available after timeout:', this.hasChatOutlet);
            if (this.hasChatOutlet) {
                console.log('Chat outlet is connected:', this.chatOutlet);
                if (this.chatOutlet.chatHistoryValue && this.chatOutlet.chatHistoryValue.length > 0) {
                    console.log('Found history data in parent controller after timeout');
                    this.chatHistoryValue = this.chatOutlet.chatHistoryValue;
                    this.render();
                } else if (this.chatOutlet.isAuthenticatedValue) {
                    // If authenticated but no history, try fetching directly
                    console.log('Authenticated but no history data, fetching directly');
                    this.fetchHistoryDirectly();
                }
            } else {
                // If outlet still not connected, try fetching directly
                console.log('Outlet still not connected after timeout, fetching history directly');
                this.fetchHistoryDirectly();
            }
        }, 1000);

        // Check if we already have chat history from the parent controller
        if (this.hasChatOutlet && this.chatOutlet.chatHistoryValue && this.chatOutlet.chatHistoryValue.length > 0) {
            console.log('Found history data in parent controller on connect');
            this.chatHistoryValue = this.chatOutlet.chatHistoryValue;
            this.render();
        } else {
            console.log('No history data in parent controller on connect');
        }
    }

    // Correctly named value callback for chatHistoryValue on the chat outlet
    chatChatHistoryValueChanged() {
        console.log('CALLBACK: chatChatHistoryValueChanged fired.');
        // Sync local value and render
        if (this.hasChatOutlet && this.chatOutlet.chatHistoryValue) {
             console.log('Rendering history list via value changed callback.');
             this.chatHistoryValue = this.chatOutlet.chatHistoryValue;
             this.currentThreadIdValue = this.chatOutlet.currentThreadIdValue;
             this.render();
        } else {
             console.warn('chatChatHistoryValueChanged fired but outlet/data not ready?');
        }
    }

    // Value callback triggered when currentThreadIdValue changes in the chat outlet
    currentThreadIdValueChanged() { // Keep this for highlighting active chat
        if (this.hasChatOutlet) {
            this.currentThreadIdValue = this.chatOutlet.currentThreadIdValue;
            this.highlightActiveSession(); // Re-highlight based on new ID
        }
    }

    // Method to be called directly from the chat controller
    renderHistory(history) {
        console.log(`Rendering history from explicit call with ${history.length} items`);
        this.chatHistoryValue = history;
        this.render();
    }

    render() {
        if (!this.hasListContainerTarget) {
             console.error('Chat history render failed: listContainerTarget not found.');
             return;
        }
        if (!this.chatHistoryValue) {
             console.warn('Chat history render skipped: chatHistoryValue is not set.');
             return;
        }

        console.log(`Rendering ${this.chatHistoryValue.length} history items.`);
        console.log('History items:', JSON.stringify(this.chatHistoryValue));
        console.log('List container element:', this.listContainerTarget);

        // Clear existing list including the "Loading history..." message
        this.listContainerTarget.innerHTML = '';

        // If no history items, show a message
        if (this.chatHistoryValue.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.classList.add('text-xs', 'text-gray-500', 'p-2');
            emptyMessage.textContent = 'No chat history available';
            this.listContainerTarget.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();

        this.chatHistoryValue.forEach((session, index) => {
            console.log(`Creating item for session ${index}:`, session);
            const item = document.createElement('button'); // Use button for accessibility
            item.type = 'button';
            item.classList.add('block', 'w-full', 'text-left', 'px-4', 'py-2', 'text-sm', 'text-gray-700', 'hover:bg-gray-100', 'truncate', 'border', 'border-gray-300', 'mb-1');
            item.dataset.action = 'click->chat-history#selectChat';
            item.dataset.threadId = session.threadId || session.id; // Use threadId if available
            item.textContent = session.title || `Chat ${session.id}`; // Use title or fallback

            // Add target for potential styling/updates
            item.setAttribute('data-chat-history-target', 'sessionItem');

            // Highlight if it's the current session
            if (item.dataset.threadId === this.currentThreadIdValue) {
                item.classList.add('bg-gray-200', 'font-semibold');
            }

            fragment.appendChild(item);
        });

        // Add the fragment to the DOM
        this.listContainerTarget.appendChild(fragment);
        console.log('Added history items to DOM. Current listContainer HTML:', this.listContainerTarget.innerHTML);
    }

    highlightActiveSession() {
        this.sessionItemTargets.forEach(item => {
            if (item.dataset.threadId === this.currentThreadIdValue) {
                item.classList.add('bg-gray-200', 'font-semibold');
            } else {
                item.classList.remove('bg-gray-200', 'font-semibold');
            }
        });
    }

    selectChat(event) {
        const threadId = event.currentTarget.dataset.threadId;
        if (threadId && this.hasChatOutlet && threadId !== this.currentThreadIdValue) {
            console.log('Dispatching select chat event:', threadId);
            this.chatOutlet.handleSelectChat({ detail: { threadId } });
            // Highlight immediately (optional, chat controller might update value triggering highlight)
            this.currentThreadIdValue = threadId;
            this.highlightActiveSession();
        }
    }

    startNewChat() {
        if (this.hasChatOutlet) {
            console.log('Dispatching start new chat event');
            this.chatOutlet.handleStartNewChat();
        }
    }

    // Handler for the outletConnected event
    handleOutletConnected(event) {
        console.log('Received outletConnected event:', event.detail);
        if (event.detail.controller === 'chat') {
            console.log('Chat controller outlet connected, checking for history data');
            if (this.hasChatOutlet && this.chatOutlet.chatHistoryValue && this.chatOutlet.chatHistoryValue.length > 0) {
                console.log('Found history data after outlet connected event');
                this.chatHistoryValue = this.chatOutlet.chatHistoryValue;
                this.render();
            } else if (this.hasChatOutlet && this.chatOutlet.isAuthenticatedValue) {
                console.log('Authenticated but no history data after outlet connected event, fetching directly');
                this.fetchHistoryDirectly();
            }
        }
    }

    // Clean up event listeners when the controller is disconnected
    disconnect() {
        console.log('Chat history controller disconnected');
        document.removeEventListener('chat:outletConnected', this.handleOutletConnected.bind(this));
    }

    // Method to directly fetch history if outlet connection fails
    async fetchHistoryDirectly() {
        console.log('Fetching history directly from chat-history controller');
        try {
            const response = await fetch('/api/chat/history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const history = await response.json();
            console.log(`Fetched ${history.length} history items directly`);
            this.chatHistoryValue = history;
            this.render();
            return history;
        } catch (error) {
            console.error('Error fetching chat history directly:', error);
            return [];
        }
    }
}
