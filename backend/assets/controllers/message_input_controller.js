import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['input'];

    connect() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('modelSelectionChanged', this.handleModelSelectionChange.bind(this));
    }

    handleModelSelectionChange(event) {
        this.selectedModels = event.detail.selectedModels;
    }

    handleKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const content = this.inputTarget.value.trim();
        if (!content) return;

        if (!this.selectedModels || this.selectedModels.length === 0) {
            alert('Please select at least one model');
            return;
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    prompt: content,
                    models: this.selectedModels,
                    stream: true
                })
            });

            if (response.ok) {
                this.inputTarget.value = '';
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                this.dispatch('messageSent', { detail: { success: true } });
                                continue;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                this.dispatch('messageReceived', { detail: parsed });
                            } catch (e) {
                                console.error('Error parsing message:', e);
                            }
                        }
                    }
                }
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }
} 