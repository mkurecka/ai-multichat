import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels, refreshModels, isAuthenticated, checkTokenRefresh, getThreadHistory, logout } from './services/api';
import { useNavigate } from 'react-router-dom';
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatHistory from './components/ChatHistory';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

function App() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const MAX_MODELS = 16;
  const hasMessages = messages.length > 0;

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      // Check if user is authenticated
      if (!isAuthenticated()) {
        // Redirect to login if not authenticated
        navigate('/login');
        return;
      }
      
      // Check if token needs to be refreshed
      try {
        await checkTokenRefresh();
      } catch (error) {
        console.error('Error checking token:', error);
        // If token refresh fails, redirect to login
        navigate('/login');
        return;
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Try to get models from cache first
        let fetchedModels = await getModels();
        
        // If no models returned, refresh the cache
        if (!fetchedModels || fetchedModels.length === 0) {
          fetchedModels = await refreshModels();
        }
        
        setModels(fetchedModels.map(model => ({ ...model, selected: false })));
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };

    fetchModels();
  }, []);

  // Fetch chat history on mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const history = await getChatHistory();
        const sessions: ChatSession[] = history.map((entry: any) => ({
          id: entry.id.toString(),
          title: entry.title,
          threadId: entry.threadId,
          messages: entry.messages.map((msg: any) => [
            { role: 'user' as const, content: msg.prompt },
            { role: 'assistant' as const, content: Object.values(msg.responses)[0] as string, modelId: msg.modelId }
          ]).flat(),
          selectedModels: [],
        }));
        setChatHistory(sessions);
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      }
    };

    fetchChatHistory();
  }, []);

  const handleModelToggle = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId ? { ...model, selected: !model.selected } : model
      )
    );
  };

  const handleSendMessage = async (messages: Message[], prompt: string) => {
    setIsLoading(true);
    const selectedModelIds = models.filter(model => model.selected).map(model => model.id);
    
    if (selectedModelIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const reloadThreadData = async (threadId: string) => {
      try {
        const threadData = await getThreadHistory(threadId);
        
        if (threadData && threadData.messages) {
          const updatedMessages: Message[] = [];
          for (const msg of threadData.messages) {
            updatedMessages.push({
              role: 'user',
              content: msg.prompt,
              modelId: msg.modelId
            });
            
            if (msg.responses) {
              Object.entries(msg.responses).forEach(([modelId, content]) => {
                updatedMessages.push({
                  role: 'assistant',
                  content: content as string,
                  modelId: modelId
                });
              });
            }
          }
          setMessages(updatedMessages);
          
          setChatHistory(prev => prev.map(session => 
            session.threadId === threadId
              ? { ...session, messages: updatedMessages }
              : session
          ));
        }
      } catch (error) {
        console.error('Error reloading thread data:', error);
      }
    };

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      modelId: selectedModelIds[0]
    };

    setMessages(prev => [...prev, userMessage]);

    // Update chat history with user message
    setChatHistory(prev => prev.map(session => 
      (session.threadId === currentSessionId || (!session.threadId && session.id === Date.now().toString()))
        ? { ...session, messages: [...session.messages, userMessage] }
        : session
    ));

    try {
      const response = await sendMessageToModels(
        prompt,
        selectedModelIds,
        currentSessionId || undefined,
        undefined,
        (modelId, content) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.modelId === modelId) {
              lastMessage.content = content;
            } else {
              newMessages.push({
                role: 'assistant' as const,
                content: content,
                modelId: modelId
              });
            }
            return newMessages;
          });

          // Update chat history with streaming content
          setChatHistory(prev => prev.map(session => {
            if (session.threadId === currentSessionId || (!session.threadId && session.id === Date.now().toString())) {
              const lastMessage = session.messages[session.messages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant' && lastMessage.modelId === modelId) {
                const updatedMessages = [...session.messages];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  content: content
                };
                return { ...session, messages: updatedMessages };
              } else {
                return {
                  ...session,
                  messages: [...session.messages, {
                    role: 'assistant',
                    content: content,
                    modelId: modelId
                  }]
                };
              }
            }
            return session;
          }));
        }
      );

      // Handle the final response
      if (response.threadId) {
        setCurrentSessionId(response.threadId);
        // Reload thread data to ensure consistency
        setTimeout(async () => {
          await reloadThreadData(response.threadId);
        }, 500);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      let errorMessage = 'Error: Failed to send message. Please try again.';
      
      if (error.response?.status === 500 && error.response?.data?.detail?.includes('Maximum execution time')) {
        errorMessage = 'The request took too long to process. Please try again or try with a shorter message.';
      } else if (error.response?.data?.detail) {
        errorMessage = `Error: ${error.response.data.detail}`;
      }

      const errorResponse: Message = {
        role: 'assistant' as const,
        content: errorMessage,
        modelId: selectedModelIds[0]
      };
      
      setMessages(prev => [...prev, errorResponse]);
      
      // Update chat history with error message
      setChatHistory(prev => prev.map(session => 
        (session.threadId === currentSessionId || (!session.threadId && session.id === Date.now().toString()))
          ? { ...session, messages: [...session.messages, errorResponse] }
          : session
      ));

      // If we have a thread ID, try to reload it after error
      if (currentSessionId) {
        setTimeout(async () => {
          try {
            await reloadThreadData(currentSessionId);
          } catch (reloadError) {
            console.error('Error reloading thread after error:', reloadError);
          }
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = async (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.threadId || sessionId);
      setMessages(session.messages);
      
      // Update model selection based on the chat
      const modelIds = [...new Set(session.messages
        .filter((m: Message) => m.role === 'assistant')
        .map((m: Message) => m.modelId))];
        
      setModels(prevModels => 
        prevModels.map(model => ({
          ...model,
          selected: modelIds.includes(model.id)
        }))
      );
    }
  };

  const handleStartNewChat = async () => {
    setCurrentSessionId(null);
    setMessages([]);
    setModels(prevModels => prevModels.map(model => ({ ...model, selected: false })));
    // Update chat history to show the new empty thread
    const updatedHistory = await getChatHistory();
    setChatHistory(updatedHistory);
  };

  const toggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat History Sidebar */}
      <div className={`w-64 bg-white border-r ${showChatHistory ? '' : 'hidden'}`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Chat History</h2>
        </div>
        <div className="overflow-y-auto h-full">
          {chatHistory.map((session) => (
            <div
              key={session.threadId || session.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                currentSessionId === (session.threadId || session.id) ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleSelectChat(session.id)}
            >
              <h3 className="font-medium truncate">{session.title || 'New Chat'}</h3>
              <p className="text-sm text-gray-500 truncate">
                {session.messages[session.messages.length - 1]?.content || 'No messages'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleChatHistory}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-semibold">AI MultiChat</h1>
          </div>
          <button
            onClick={handleStartNewChat}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Chat
          </button>
        </div>

        {/* Chat Window */}
        <ChatWindow
          messages={messages}
          models={models}
          onModelToggle={handleModelToggle}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default App;
