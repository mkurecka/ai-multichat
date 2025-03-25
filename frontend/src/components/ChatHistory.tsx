import React, { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistoryProps {
  chatSessions: ChatSession[];
  onSelectChat: (sessionId: string) => void;
  onStartNewChat: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chatSessions,
  onSelectChat,
  onStartNewChat
}) => {
  const [activeTab, setActiveTab] = useState<'chats'>('chats');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </div>
      
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === 'chats' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {chatSessions.length > 0 ? (
          <ul className="divide-y">
            {chatSessions.map((session) => (
              <li key={session.id}>
                <button
                  className="w-full p-3 text-left hover:bg-gray-100 flex items-center"
                  onClick={() => onSelectChat(session.id)}
                >
                  <MessageSquare size={18} className="mr-2 text-gray-500" />
                  <span className="truncate">{session.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500">No chat history</div>
        )}
      </div>
      
      <div className="p-3 border-t">
        <button
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
          onClick={onStartNewChat}
        >
          <Plus size={18} className="mr-2" />
          New Chat
        </button>
      </div>
    </div>
  );
};

export default ChatHistory;