import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels, refreshModels, isAuthenticated, checkTokenRefresh } from './services/api';
import { useNavigate } from 'react-router-dom';
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatHistory from './components/ChatHistory';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          title: entry.prompt,
          messages: [
            { role: 'user' as const, content: entry.prompt },
            ...Object.entries(entry.responses).map(([modelId, content]) => ({
              role: 'assistant' as const,
              content: content as string,
              modelId,
            })),
          ],
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

  const handleSendMessage = async (responses: Message[], prompt: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: prompt };
    
    // Update messages with user message and model responses
    setMessages(prevMessages => [...prevMessages, userMessage, ...responses]);
  };

  const handleSelectChat = (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      
      // Update model selection based on the chat
      const modelIds = session.selectedModels;
      setModels(prevModels => 
        prevModels.map(model => ({
          ...model,
          selected: modelIds.includes(model.id)
        }))
      );
    }
  };

  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setModels(prevModels => prevModels.map(model => ({ ...model, selected: false })));
  };

  const toggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      {/* Chat History Sidebar */}
      <div className={`bg-white border-r flex flex-col transition-all duration-300 ${showChatHistory ? 'w-72' : 'w-0'}`}>
        {showChatHistory && (
          <ChatHistory
            chatSessions={chatHistory}
            onSelectChat={handleSelectChat}
            onStartNewChat={handleStartNewChat}
          />
        )}
      </div>

      {/* Toggle Chat History Button */}
      <button
        onClick={toggleChatHistory}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-r-md p-1 shadow-sm z-10"
      >
        {showChatHistory ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
          {showModelSelector && (
            <div className={`${hasMessages ? 'h-auto' : ''}`}>
              <ModelSelector
                models={models}
                onModelToggle={handleModelToggle}
                maxModels={MAX_MODELS}
              />
            </div>
          )}

          <div className={`flex-1 flex flex-col overflow-hidden bg-gray-50 rounded-lg shadow ${hasMessages ? 'flex-grow' : ''}`}>
            <ChatWindow
              messages={messages}
              models={models}
              onModelToggle={handleModelToggle}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
