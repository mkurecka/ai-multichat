import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, DollarSign } from 'lucide-react';
import { ChatSession } from '../types';
import { useNavigate } from 'react-router-dom';
import { getThreadCosts, ThreadCost } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'chats' | 'costs'>('chats');
  const [threadCosts, setThreadCosts] = useState<ThreadCost[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchThreadCosts = async () => {
    try {
      setLoading(true);
      const data = await getThreadCosts();
      setThreadCosts(data);
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'costs') {
      fetchThreadCosts();
    }
  }, [activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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
        <button
          className={`flex-1 py-2 text-center ${
            activeTab === 'costs' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('costs')}
        >
          Costs
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          chatSessions.length > 0 ? (
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
          )
        ) : (
          loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : threadCosts.length > 0 ? (
            <ul className="divide-y">
              {threadCosts.map((thread) => (
                <li key={thread.threadId}>
                  <div className="p-3 hover:bg-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{thread.title}</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(thread.totalCost)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {thread.messageCount} messages • {new Date(thread.lastMessageDate).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">No cost data available</div>
          )
        )}
      </div>
      
      {activeTab === 'chats' && (
        <div className="p-3 border-t">
          <button
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
            onClick={onStartNewChat}
          >
            <Plus size={18} className="mr-2" />
            New Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;