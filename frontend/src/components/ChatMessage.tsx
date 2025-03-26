import React from 'react';
import { Message } from '../types';
import { User, Bot, Activity } from 'lucide-react';

interface ChatMessageProps {
    message: Message;
    modelName?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, modelName }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 ${isUser ? 'justify-start' : 'justify-start'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUser ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
            }`}>
                {isUser ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm text-gray-500">
                        {isUser ? 'You' : modelName || 'Assistant'}
                    </div>
                    {!isUser && message.usage && (
                        <div className="flex items-center text-xs text-gray-500">
                            <Activity size={14} className="mr-1" />
                            <span>
                                {message.usage.total_tokens} tokens
                                ({message.usage.prompt_tokens} prompt + {message.usage.completion_tokens} completion)
                            </span>
                        </div>
                    )}
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">
                    {message.content}
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;