import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels, refreshModels, isAuthenticated, checkTokenRefresh, getThreadHistory, logout, createThread } from './services/api';
import { useNavigate, Routes, Route } from 'react-router-dom';
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatHistory from './components/ChatHistory';
import { ChevronLeft, ChevronRight, LogOut, User, DollarSign } from 'lucide-react';
import CostsPage from './components/CostsPage';
import { Layout } from './components/Layout';
import { Header } from './components/Header';

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const MAX_MODELS = 16;
  const hasMessages = messages.length > 0;

  // Helper function to safely get message content
  const getMessageContent = (message: Message): string => {
    if (!message?.content) return '';
    if (typeof message.content === 'string') return message.content;
    if (typeof message.content === 'object' && message.content !== null) {
      return message.content.content || JSON.stringify(message.content);
    }
    return JSON.stringify(message.content);
  };

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
        // Get user email from token
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserEmail(payload.email);
        }
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
      // Only log in development mode
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        console.log('Starting to fetch models...');
      }
      
      try {
        const cachedModels = localStorage.getItem('models');
        if (isDevelopment) {
          console.log('Cached models:', cachedModels ? JSON.parse(cachedModels) : 'None');
        }
        
        if (cachedModels) {
          const parsedModels = JSON.parse(cachedModels);
          if (isDevelopment) {
            console.log('Setting cached models:', parsedModels);
          }
          setModels(parsedModels);
          return;
        }

        if (isDevelopment) {
          console.log('No cache found, fetching from API...');
        }
        const response = await getModels();
        if (isDevelopment) {
          console.log('API response:', response);
        }
        
        if (response && Array.isArray(response)) {
          if (isDevelopment) {
            console.log('Setting models from API:', response);
          }
          setModels(response);
          localStorage.setItem('models', JSON.stringify(response));
        } else {
          console.error('Invalid API response:', response);
          setModels([]);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
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
            ...Object.entries(msg.responses).map(([modelId, response]: [string, any]) => ({
              role: 'assistant' as const,
              content: typeof response === 'string' ? response : response.content || JSON.stringify(response),
              modelId
            }))
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

    try {
      // Get promptId from sendMessageToModels
      const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: prompt,
        modelId: selectedModelIds[0],
        promptId: promptId,
        threadId: currentSessionId
      };

      setMessages(prev => [...prev, userMessage]);

      // Update chat history with user message
      setChatHistory(prev => {
        // Find existing session with matching threadId
        const existingSession = prev.find(session => session.threadId === currentSessionId);
        
        if (existingSession) {
          // Update existing session
          return prev.map(session => 
            session.threadId === currentSessionId
              ? { ...session, messages: [...session.messages, userMessage] }
              : session
          );
        }
        return prev;
      });

      const response = await sendMessageToModels(
        prompt,
        selectedModelIds,
        currentSessionId || undefined,
        undefined,
        (modelId, content: string | { content: string }, promptId: string, threadId?: string) => {
          const contentString = typeof content === 'string' ? content : content.content || JSON.stringify(content);
          
          // Update currentSessionId if we got a new threadId
          if (threadId) {
            setCurrentSessionId(threadId);
          }

          setMessages(prev => {
            const newMessages = [...prev];
            // Find the message with matching modelId, threadId and promptId
            const existingMessageIndex = newMessages.findIndex(msg => 
              msg.role === 'assistant' && 
              msg.modelId === modelId &&
              msg.threadId === (threadId || currentSessionId) &&
              msg.promptId === promptId
            );

            if (existingMessageIndex !== -1) {
              newMessages[existingMessageIndex] = {
                ...newMessages[existingMessageIndex],
                content: contentString,
                threadId: threadId || currentSessionId
              };
            } else {
              newMessages.push({
                role: 'assistant' as const,
                content: contentString,
                modelId: modelId,
                threadId: threadId || currentSessionId,
                promptId: promptId
              });
            }
            return newMessages;
          });

          // Update chat history with streaming content
          setChatHistory(prev => {
            // Find existing session with matching threadId
            const existingSession = prev.find(session => session.threadId === (threadId || currentSessionId));
            
            if (existingSession) {
              return prev.map(session => {
                if (session.threadId === (threadId || currentSessionId)) {
                  const existingMessageIndex = session.messages.findIndex(msg => 
                    msg.role === 'assistant' && 
                    msg.modelId === modelId &&
                    msg.threadId === (threadId || currentSessionId) &&
                    msg.promptId === promptId
                  );

                  if (existingMessageIndex !== -1) {
                    const updatedMessages = [...session.messages];
                    updatedMessages[existingMessageIndex] = {
                      ...updatedMessages[existingMessageIndex],
                      content: contentString,
                      threadId: threadId || currentSessionId
                    };
                    return { ...session, messages: updatedMessages };
                  } else {
                    return {
                      ...session,
                      messages: [...session.messages, {
                        role: 'assistant',
                        content: contentString,
                        modelId: modelId,
                        threadId: threadId || currentSessionId,
                        promptId: promptId
                      }]
                    };
                  }
                }
                return session;
              });
            }
            return prev;
          });
        }
      );

      // Update currentSessionId if we got a new threadId from the response
      if (response.threadId) {
        setCurrentSessionId(response.threadId);
        // Update chat history with new threadId
        setChatHistory(prev => prev.map(session => 
          session.threadId === currentSessionId || (!session.threadId && session.id === Date.now().toString())
            ? { ...session, threadId: response.threadId }
            : session
        ));
        // Update all messages with new threadId
        setMessages(prev => prev.map(msg => ({
          ...msg,
          threadId: response.threadId
        })));
      }

      // Only reload thread data if we don't have streaming responses
      const hasStreamingResponses = messages.some(msg => 
        msg.role === 'assistant' && 
        msg.threadId === currentSessionId && 
        msg.promptId === promptId
      );
      
      if (!hasStreamingResponses && currentSessionId) {
        setTimeout(async () => {
          await reloadThreadData(currentSessionId);
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
    try {
      // Create a new thread immediately
      const { threadId } = await createThread();
      setCurrentSessionId(threadId);
      setMessages([]);
      setModels(prevModels => prevModels.map(model => ({ ...model, selected: false })));
      
      // Add the new thread to chat history
      setChatHistory(prev => [{
        id: Date.now().toString(),
        title: 'New Chat',
        threadId: threadId,
        messages: [],
        selectedModels: []
      }, ...prev]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const toggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <div className={`${showChatHistory ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-white shadow-md`}>
            <ChatHistory 
              chatSessions={chatHistory} 
              onSelectChat={handleSelectChat}
              onStartNewChat={handleStartNewChat}
            />
          </div>
          
          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <Header />
            
            {/* Chat area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <ChatWindow 
                messages={messages}
                models={models}
                onModelToggle={handleModelToggle}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                maxModels={16}
              />
            </div>
          </div>
        </div>
      } />
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/costs" element={<CostsPage />} />
    </Routes>
  );
}

export default App;
