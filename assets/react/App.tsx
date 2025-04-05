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
        setChatHistory(history);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchChatHistory();
  }, []);

  // Function to fetch chat history
  const fetchChatHistory = async () => {
    try {
      const history = await getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId ? { ...model, selected: !model.selected } : model
      )
    );
  };

  const handleSendMessage = async (messages: Message[], prompt: string) => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    
    // Create a new message object
    const userMessage: Message = {
      role: 'user',
      content: prompt,
      id: `msg_${Date.now()}`,
      threadId: currentSessionId
    };
    
    // Add the user message to the messages array
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessage('');
    
    // Generate a unique promptId
    const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create placeholder messages for each selected model
    const modelPlaceholders: Message[] = selectedModels.map(modelId => ({
      role: 'assistant',
      content: '...',
      modelId,
      id: `msg_${Date.now()}_${modelId}`,
      threadId: currentSessionId,
      promptId
    }));
    
    // Add the placeholder messages to the messages array
    setMessages([...updatedMessages, ...modelPlaceholders]);
    
    try {
      // Stream handler function
      const handleStream = (modelId: string, content: string, promptId: string, threadId: string) => {
        setMessages(prevMessages => {
          // Find the message with the matching modelId and promptId
          const messageIndex = prevMessages.findIndex(
            msg => msg.modelId === modelId && msg.promptId === promptId
          );
          
          if (messageIndex === -1) return prevMessages;
          
          // Create a new array with the updated message
          const newMessages = [...prevMessages];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content
          };
          
          return newMessages;
        });
      };
      
      // Send the message to the selected models
      const response = await sendMessageToModels(
        prompt,
        selectedModels,
        currentSessionId || undefined,
        undefined,
        handleStream
      );
      
      // If we're not using streaming, update the messages with the responses
      if (!response.streaming) {
        setMessages(prevMessages => {
          // Remove the placeholder messages
          const filteredMessages = prevMessages.filter(
            msg => !(msg.promptId === promptId && msg.role === 'assistant')
          );
          
          // Add the actual responses
          const modelResponses: Message[] = Object.entries(response.responses).map(([modelId, data]: [string, any]) => ({
            role: 'assistant' as const,
            content: data.content,
            modelId,
            id: `msg_${Date.now()}_${modelId}`,
            threadId: response.threadId,
            promptId,
            usage: data.usage
          }));
          
          return [...filteredMessages, ...modelResponses];
        });
      }
      
      // Update the current session ID if it's a new thread
      if (!currentSessionId && response.threadId) {
        setCurrentSessionId(response.threadId);
      }
      
      // Reload the chat history to include the new messages
      await fetchChatHistory();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the placeholder messages
      setMessages(prevMessages => 
        prevMessages.filter(msg => !(msg.promptId === promptId && msg.role === 'assistant'))
      );
      
      // Add an error message
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant' as const,
          content: 'Error: Failed to send message. Please try again.',
          id: `error_${Date.now()}`,
          threadId: currentSessionId
        }
      ]);
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
