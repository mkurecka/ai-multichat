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
    if (!prompt.trim()) return;

    // Get selected models
    const selectedModelIds = models.filter(m => m.selected).map(m => m.id);
    if (selectedModelIds.length === 0) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      modelId: selectedModelIds[0] // Use first model for user message
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessageToModels(prompt, selectedModelIds, currentSessionId || undefined);
      
      if (response instanceof ReadableStream) {
        const reader = response.getReader();
        const decoder = new TextDecoder();
        let currentModelId = selectedModelIds[0];
        let currentContent = '';
        let currentThreadId = currentSessionId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.done) {
                currentThreadId = data.threadId;
                // Update session with new thread ID if needed
                if (!currentSessionId) {
                  setCurrentSessionId(data.threadId);
                }
                break;
              }

              if (data.content) {
                currentContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.modelId === currentModelId) {
                    lastMessage.content = currentContent;
                  } else {
                    newMessages.push({
                      role: 'assistant' as const,
                      content: currentContent,
                      modelId: currentModelId
                    });
                  }
                  return newMessages;
                });
              }
            }
          }
        }

        // Update chat history with the new message
        if (currentThreadId) {
          const updatedHistory = await getChatHistory();
          setChatHistory(updatedHistory);
        }
      } else {
        // Handle non-streaming response
        const responses = (response as { responses: Record<string, { content: string }> }).responses;
        const newMessages: Message[] = Object.entries(responses).map(([modelId, response]) => ({
          role: 'assistant' as const,
          content: response.content,
          modelId
        }));

        setMessages(prev => [...prev, ...newMessages]);

        // Update chat history
        if ((response as { threadId: string }).threadId) {
          const updatedHistory = await getChatHistory();
          setChatHistory(updatedHistory);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Error: Failed to send message. Please try again.',
        modelId: selectedModelIds[0]
      }]);
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
