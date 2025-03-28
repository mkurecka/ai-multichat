import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['historyList'];

    connect() {
        this.loadChatHistory();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('messageSent', this.handleMessageSent.bind(this));
    }

    async loadChatHistory() {
        try {
            const response = await fetch('/api/chat/history', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const history = await response.json();
                this.renderHistory(history);
            } else {
                throw new Error('Failed to load chat history');
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    renderHistory(history) {
        this.historyListTarget.innerHTML = history.map(session => `
            <div class="p-2 rounded-md hover:bg-gray-50 cursor-pointer ${session.id === this.currentSessionId ? 'bg-indigo-50' : ''}"
                 data-action="click->chat-history#selectChat"
                 data-chat-id="${session.id}">
                <div class="text-sm font-medium text-gray-900">${session.title}</div>
                <div class="text-xs text-gray-500">${session.messages.length} messages</div>
            </div>
        `).join('');
    }

    async selectChat(event) {
        const chatId = event.currentTarget.dataset.chatId;
        this.currentSessionId = chatId;

        try {
            const response = await fetch(`/api/chat/thread/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const thread = await response.json();
                this.dispatch('chatSelected', { detail: thread });
                this.renderHistory(await this.getChatHistory());
            } else {
                throw new Error('Failed to load chat thread');
            }
        } catch (error) {
            console.error('Error selecting chat:', error);
            alert('Failed to load chat. Please try again.');
        }
    }

    async startNewChat() {
        try {
            const response = await fetch('/api/chat/thread', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const newThread = await response.json();
                this.currentSessionId = newThread.id;
                this.dispatch('chatSelected', { detail: newThread });
                this.loadChatHistory();
            } else {
                throw new Error('Failed to create new chat');
            }
        } catch (error) {
            console.error('Error creating new chat:', error);
            alert('Failed to create new chat. Please try again.');
        }
    }

    handleMessageSent(event) {
        this.loadChatHistory();
    }

    async getChatHistory() {
        const response = await fetch('/api/chat/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.ok ? await response.json() : [];
    }
} 