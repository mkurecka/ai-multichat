import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels, refreshModels, isAuthenticated, checkTokenRefresh, getThreadHistory } from './services/api';
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

  const handleSendMessage = async (responses: Message[], prompt: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: prompt };
    
    // Update messages with user message and empty responses
    const emptyResponses = models
      .filter(m => m.selected)
      .map(m => ({ role: 'assistant' as const, content: '', modelId: m.id }));
    
    setMessages(prevMessages => [...prevMessages, userMessage, ...emptyResponses]);

    // Get current thread ID or create new one
    const currentThreadId = currentSessionId || undefined;
    const lastMessage = messages[messages.length - 1];
    const parentId = lastMessage?.id;

    // Send message to API with streaming
    try {
      const result = await sendMessageToModels(
        prompt,
        models.filter(m => m.selected).map(m => m.id),
        currentThreadId,
        parentId,
        (modelId, content) => {
          setMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const responseIndex = newMessages.findIndex(
              m => m.role === 'assistant' && m.modelId === modelId
            );
            if (responseIndex !== -1) {
              newMessages[responseIndex] = {
                ...newMessages[responseIndex],
                content
              };
            }
            return newMessages;
          });
        }
      );
      
      // Update thread ID if this is a new thread
      if (!currentThreadId && result.threadId) {
        setCurrentSessionId(result.threadId);
      }

      // Fetch updated chat history
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
      console.error('Failed to send message:', error);
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
      <div className={`bg-white border-l flex flex-col transition-all duration-300 ${showChatHistory ? 'w-72' : 'w-0'}`}>
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
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-l-md p-1 shadow-sm z-10"
      >
        {showChatHistory ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
