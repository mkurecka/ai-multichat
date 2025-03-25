import React, { useState, useEffect } from 'react';
import { getChatHistory } from '../api';
import { MessageSquare, Plus, Users } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string; // We'll use the prompt as the title
}

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
  const [activeTab, setActiveTab] = useState<'chats' | 'projects'>('chats');
  const [loading, setLoading] = useState(false);

  return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">Multi-Model Chat</h2>

          <button
              onClick={onStartNewChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus size={16} />
            <span>Start new chat</span>
          </button>

          <div className="flex mt-4 space-x-1">
            <button
                className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center ${
                    activeTab === 'chats'
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('chats')}
            >
              <MessageSquare size={16} className="mr-2" />
              Chats
            </button>
            <button
                className={`flex-1 py-2 text-sm rounded-md transition-colors flex items-center justify-center ${
                    activeTab === 'projects'
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('projects')}
            >
              <Users size={16} className="mr-2" />
              Projects
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
              <div className="text-center text-gray-500">Loading chat history...</div>
          ) : (
              <div className="mt-2">
                <h3 className="text-xs uppercase text-gray-500 font-medium px-2 mb-1">Recents</h3>
                <ul className="space-y-1">
                  {chatSessions.map(session => (
                      <li key={session.id}>
                        <button
                            onClick={() => onSelectChat(session.id)}
                            className="w-full text-left px-2 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded truncate"
                        >
                          {session.title}
                        </button>
                      </li>
                  ))}
                </ul>
              </div>
          )}
        </div>
      </div>
  );
};

export default ChatHistory;