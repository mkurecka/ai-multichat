import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels, refreshModels, isAuthenticated, checkTokenRefresh, getThreadHistory, logout, createThread } from './services/api';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'; // Added Navigate
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatHistory from './components/ChatHistory';
import Callback from './components/Callback'; // Import the Callback component
import Login from './components/Login'; // Import the actual Login component
import { ChevronLeft, ChevronRight, LogOut, User, DollarSign } from 'lucide-react';
import CostsPage from './components/CostsPage';
import { Header } from './components/Header'; // Restore Header import

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

function App() {
  const navigate = useNavigate(); // Keep navigate for potential future use
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Restore isLoading state for chat operations
  const [message, setMessage] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading'); // Keep authStatus for initial load/auth check
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

   // Verify authentication status ONCE on mount
   useEffect(() => {
     const verifyAuth = async () => {
       // No need to set isLoading here, authStatus handles initial load state
       const authenticated = isAuthenticated(); // Initial check

       if (authenticated) {
        try {
          await checkTokenRefresh(); // Try to refresh if needed
          // Re-check authentication after potential refresh/removal
          if (isAuthenticated()) {
              const token = localStorage.getItem('token');
              if (token) {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  setUserEmail(payload.email);
              }
              setAuthStatus('authenticated');
          } else {
             // Token was removed during refresh check
             setAuthStatus('unauthenticated');
          }
        } catch (error) {
          console.error('Token refresh/validation failed:', error);
          localStorage.removeItem('token');
          setAuthStatus('unauthenticated'); // Treat as unauthenticated if refresh fails
        }
      } else {
        setAuthStatus('unauthenticated'); // Not authenticated initially
      }
    };
    verifyAuth();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Fetch models only when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated') return; // Only run if authenticated

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
  }, [authStatus]); // Re-run if authStatus changes to authenticated

  // Fetch chat history only when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated') return; // Only run if authenticated

    const fetchChatHistory = async () => {
      try {
        const history = await getChatHistory();
        setChatHistory(history);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchChatHistory();
  }, [authStatus]); // Re-run if authStatus changes to authenticated

   // Function to fetch chat history (keep as is)
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

    setIsLoading(true); // Set loading true before sending

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
    } finally {
       setIsLoading(false); // Set loading false after completion or error
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

  // Define a ProtectedRoute component using authStatus state
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    // Still show loading while verifying auth
    if (authStatus === 'loading') {
      return <div className="flex items-center justify-center min-h-screen">Verifying Authentication...</div>;
    }
    // Redirect if not authenticated
    return authStatus === 'authenticated' ? children : <Navigate to="/login" replace />;
  };

  // Show loading indicator while authStatus is 'loading'
  if (authStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading Application...</div>;
  }

  // --- Main Router ---
  return (
    <Routes>
       {/* Public route for Login - Redirect if already logged in */}
       <Route path="/login" element={authStatus === 'authenticated' ? <Navigate to="/" replace /> : <Login />} />

       {/* Public route for Callback - Handled by Callback component */}
       <Route path="/callback" element={<Callback />} />

       {/* Protected Routes - Use ProtectedRoute component */}
       <Route
         path="/" // Main application route
         element={
           <ProtectedRoute>
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
                 isLoading={isLoading} // Use the restored isLoading state
                 maxModels={16}
               />
                 </div>
               </div>
             </div>
           </ProtectedRoute>
         }
       />
       <Route
         path="/costs"
         element={
           <ProtectedRoute>
             <CostsPage />
           </ProtectedRoute>
         }
       />
       {/* Add other protected routes here */}

       {/* Optional: Redirect any unknown paths */}
       {/* Catch-all Route - Redirect based on auth status */}
       <Route path="*" element={<Navigate to={authStatus === 'authenticated' ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
