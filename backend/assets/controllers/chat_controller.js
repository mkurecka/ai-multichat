import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['modelSelector', 'chatHistory', 'messages'];

    connect() {
        this.checkAuth();
        this.setupEventListeners();
        this.currentPromptId = null;
        this.currentResponses = {};
    }

    checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login';
        }
    }

    isAuthenticated() {
        return localStorage.getItem('token') !== null;
    }

    setupEventListeners() {
        document.addEventListener('turbo:before-fetch-response', this.handleTurboResponse.bind(this));
        document.addEventListener('messageReceived', this.handleMessageReceived.bind(this));
        document.addEventListener('messageSent', this.handleMessageSent.bind(this));
    }

    handleTurboResponse(event) {
        const response = event.detail.fetchResponse;
        if (response.succeeded) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        const messagesContainer = this.messagesTarget;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    toggleModelSelector() {
        this.modelSelectorTarget.classList.toggle('hidden');
    }

    toggleChatHistory() {
        this.chatHistoryTarget.classList.toggle('hidden');
    }

    handleMessageReceived(event) {
        const data = event.detail;
        
        if (data.promptId) {
            this.currentPromptId = data.promptId;
            if (!this.currentResponses[data.promptId]) {
                this.currentResponses[data.promptId] = {};
            }
        }

        if (data.content) {
            if (!this.currentResponses[this.currentPromptId][data.modelId]) {
                this.currentResponses[this.currentPromptId][data.modelId] = '';
            }
            this.currentResponses[this.currentPromptId][data.modelId] += data.content;
            this.updateMessageDisplay(data.modelId, this.currentResponses[this.currentPromptId][data.modelId]);
        }

        if (data.usage) {
            // Handle usage data if needed
            console.log('Usage data:', data.usage);
        }
    }

    updateMessageDisplay(modelId, content) {
        let messageElement = this.messagesTarget.querySelector(`[data-model-id="${modelId}"]`);
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.setAttribute('data-model-id', modelId);
            messageElement.className = 'p-4 bg-white rounded-lg shadow mb-4';
            
            const modelHeader = document.createElement('div');
            modelHeader.className = 'font-semibold text-gray-700 mb-2';
            modelHeader.textContent = modelId;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'text-gray-800 whitespace-pre-wrap';
            
            messageElement.appendChild(modelHeader);
            messageElement.appendChild(contentDiv);
            
            this.messagesTarget.appendChild(messageElement);
        }
        
        const contentDiv = messageElement.querySelector('div:last-child');
        contentDiv.textContent = content;
        this.scrollToBottom();
    }

    handleMessageSent(event) {
        if (event.detail.success) {
            this.scrollToBottom();
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
} 