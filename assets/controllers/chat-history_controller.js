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
    }

    // Listener for history loaded/updated event from the main chat controller
    chatHistoryLoaded({ detail: { history } }) {
        console.log('Received history update:', history.length);
        this.chatHistoryValue = history;
        // Also get current thread ID from chat controller to highlight active session
        if (this.hasChatOutlet) {
            this.currentThreadIdValue = this.chatOutlet.currentThreadIdValue;
        }
        this.render();
    }

    // Listener for when a chat is selected elsewhere (e.g., after creating new)
    chatCurrentThreadIdValueChanged() {
        if (this.hasChatOutlet) {
            this.currentThreadIdValue = this.chatOutlet.currentThreadIdValue;
            this.highlightActiveSession(); // Re-highlight based on new ID
        }
    }

    render() {
        if (!this.hasListContainerTarget) return;

        this.listContainerTarget.innerHTML = ''; // Clear existing list
        const fragment = document.createDocumentFragment();

        this.chatHistoryValue.forEach(session => {
            const item = document.createElement('button'); // Use button for accessibility
            item.type = 'button';
            item.classList.add('block', 'w-full', 'text-left', 'px-4', 'py-2', 'text-sm', 'text-gray-700', 'hover:bg-gray-100', 'truncate');
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

        this.listContainerTarget.appendChild(fragment);
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
}
