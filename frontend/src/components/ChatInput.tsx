import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Message } from '../types';

interface ChatInputProps {
    onSendMessage: (messages: Message[], prompt: string) => void;
    disabled: boolean;
    selectedModels: string[];
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, selectedModels }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled && !loading) {
            setLoading(true);
            try {
                // Create a temporary user message
                const userMessage: Message = { role: 'user', content: message };
                // Call parent handler with empty responses array (will be filled by parent)
                onSendMessage([], message);
                setMessage('');
            } catch (error) {
                console.error('Failed to send message:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={disabled ? "Select at least one model to start chatting" : "Type your message here..."}
                    disabled={disabled || loading}
                    className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${disabled || loading ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                    rows={3}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
            </div>
            <button
                type="submit"
                disabled={!message.trim() || disabled || loading}
                className={`p-3 rounded-lg ${
                    !message.trim() || disabled || loading
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                <Send size={20} />
            </button>
        </form>
    );
};

export default ChatInput;