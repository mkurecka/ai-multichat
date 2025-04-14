import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getModels, Model, getAuthToken, logoutUser, handleGoogleCallback, API_BASE_URL, getChatHistory, ChatThread, getThreadHistory, ThreadHistoryResponse, MessageGroup } from './services/api';
import Layout from './components/Layout';
import './App.css';
import axios from 'axios';
import { MultiValue } from 'react-select';

// --- Google Auth Config ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = window.location.origin + window.location.pathname;

interface JwtPayload {
  username?: string;
  email?: string;
  sub?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

// --- MOCK DATA (Replace with actual state/logic) ---
// const mockChatHistory = [
//   { id: '1', title: 'Ahoj' },
//   { id: '2', title: 'make in the same position AI r...' },
//   { id: '3', title: 'chci pomoci' },
//   { id: '4', title: 'test' },
//   { id: '5', title: 'Test' },
//   { id: '6', title: 'what is nette' },
//   { id: '7', title: 'heeejeje' },
// ];

// Define the option type used in ChatArea (can be defined globally or passed down)
interface ModelOptionType {
  value: string;
  label: string;
  model: Model;
}

function App() {
  const [models, setModels] = useState<Model[]>([]); // Keep models state
  const [selectedModels, setSelectedModels] = useState<Model[]>([]); // State for selected models
  const [loading, setLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);
  // const [currentView, setCurrentView] = useState<'models' | 'chats' | 'settings'>('chats'); // Removed: Using persistent chat layout
  const [chatHistory, setChatHistory] = useState<ChatThread[]>([]); // Keep chat history state

  // --- NEW State for Active Thread ---
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadMessages, setActiveThreadMessages] = useState<MessageGroup[]>([]);
  const [threadLoading, setThreadLoading] = useState<boolean>(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const processToken = useCallback((token: string | null) => {
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUserInfo(decoded);
        setAuthToken(token);
        console.log("Decoded JWT:", decoded);
      } catch (e) {
        console.error("Failed to decode JWT:", e);
        setUserInfo(null);
        setAuthToken(null);
        localStorage.removeItem('authToken');
      }
    } else {
      setUserInfo(null);
      setAuthToken(null);
    }
  }, []);

  useEffect(() => {
    const storedToken = getAuthToken();
    processToken(storedToken);
    setIsAuthCheckComplete(true);
  }, [processToken]);

  const handleLogout = useCallback(() => {
    logoutUser();
    processToken(null);
    window.history.replaceState({}, document.title, window.location.pathname);
    setModels([]);
    setSelectedModels([]); // Clear selected models on logout
    setChatHistory([]);
    setError(null);
    // Reset active thread state on logout
    setActiveThreadId(null);
    setActiveThreadMessages([]);
    setThreadLoading(false);
    setThreadError(null);
    // setCurrentView('chats'); // Removed
  }, [processToken]);

  // Fetch ALL necessary initial data once authenticated
  const fetchInitialData = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken || loading) return; // Don't fetch if no token or already loading

    setLoading(true);
    setError(null);
    try {
      // Fetch models and history in parallel
      const [fetchedModels, fetchedHistory] = await Promise.all([
        getModels(),
        getChatHistory(),
      ]);
      setModels(fetchedModels);
      setChatHistory(fetchedHistory);
      console.log("Initial data fetched:", { fetchedModels, fetchedHistory });
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        handleLogout(); // Force logout
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching data');
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout, loading]); // Added loading to dependencies

  // Effect to handle Google callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !authToken && !authLoading) {
      setAuthLoading(true);
      setError(null);
      handleGoogleCallback(code, REDIRECT_URI)
        .then(receivedToken => {
          processToken(receivedToken);
          if (!receivedToken) {
            setError("Login failed: No token received after Google callback.");
          }
          // No need to fetch here, the other effect will handle it when authToken updates
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error("Google callback handler failed:", err);
          setError(err instanceof Error ? err.message : 'Google login failed.');
          processToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .finally(() => {
          setAuthLoading(false);
        });
    }
  }, [authToken, authLoading, processToken]); // Dependencies for callback handling

  // Effect to fetch initial data when authenticated
  useEffect(() => {
    if (authToken && !authLoading && models.length === 0 && chatHistory.length === 0) {
      console.log("Effect: Auth token present, fetching initial data...");
      fetchInitialData();
    }
  }, [authToken, authLoading, fetchInitialData, models.length, chatHistory.length]); // Dependencies for data fetching

  // --- NEW Handler for Selecting a Thread ---
  const handleSelectThread = useCallback((threadId: string) => {
    console.log("Selecting thread:", threadId);
    if (threadId === activeThreadId) return; // Do nothing if already active

    setActiveThreadId(threadId);
    setActiveThreadMessages([]); // Clear previous messages
    setThreadError(null); // Clear previous errors
    setThreadLoading(true); // Set loading state for this thread
  }, [activeThreadId]); // Depend on activeThreadId to prevent re-fetching same thread

  // --- NEW Effect to Fetch Active Thread History ---
  useEffect(() => {
    if (!activeThreadId || !authToken) {
      if (activeThreadId === null) {
         setActiveThreadMessages([]);
         setThreadLoading(false);
         setThreadError(null);
         // Don't clear selected models here, allow user to keep them for new chat
      }
      return;
    }

    let isMounted = true;
    const fetchThread = async () => {
      console.log(`Fetching history for thread: ${activeThreadId}`);
      setThreadLoading(true);
      setThreadError(null);
      try {
        const response = await getThreadHistory(activeThreadId);
        if (isMounted) {
          setActiveThreadMessages(response.messages);

          // --- Pre-select models used in this thread --- 
          const modelIdsInThread = new Set<string>();
          response.messages.forEach(group => {
              Object.keys(group.responses).forEach(modelId => {
                  modelIdsInThread.add(modelId);
              });
          });
          
          const modelsToSelect = models.filter(model => modelIdsInThread.has(model.id));
          setSelectedModels(modelsToSelect);
          console.log("Pre-selected models for thread:", modelsToSelect.map(m => m.id));
          // --------------------------------------------- 
        }
      } catch (err) {
        console.error(`Failed to fetch history for thread ${activeThreadId}:`, err);
        if (isMounted) {
           if (axios.isAxiosError(err) && err.response?.status === 401) {
               setThreadError("Session expired. Please log in again.");
               handleLogout(); // Force logout if unauthorized
           } else {
               setThreadError(err instanceof Error ? err.message : 'Failed to load chat messages.');
           }
           setSelectedModels([]); // Clear selected models on error loading thread
        }
      } finally {
        if (isMounted) {
          setThreadLoading(false);
        }
      }
    };

    fetchThread();

    return () => {
      isMounted = false;
    };
  }, [activeThreadId, authToken, handleLogout, models]);

  const handleGoogleLoginClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Client ID is not configured in .env file (VITE_GOOGLE_CLIENT_ID).");
      return;
    }
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'email profile openid',
    });
    window.location.href = `${googleAuthUrl}?${params.toString()}`;
  };

  // --- Update handleSelectModel --- 
  const handleSelectModel = (selectedOptions: MultiValue<ModelOptionType>) => {
    console.log("Selected Options:", selectedOptions);
    const limitedSelection = selectedOptions.slice(0, 16);
    const newSelectedModels = limitedSelection.map(option => option.model);
    setSelectedModels(newSelectedModels);
  };

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message, "to models:", selectedModels.map(m => m.id));
    // TODO: Implement API call logic here using selectedModels
    // Needs to handle adding the new prompt/response to activeThreadMessages state
    // or re-fetching if necessary
  };

  const handleNewChat = () => {
    console.log("Starting new chat...");
    setActiveThreadId(null); // Clear active thread selection
    setSelectedModels([]); // Clear selected models for a new chat
  };


  // --- Render Logic ---
  if (!isAuthCheckComplete) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Checking authentication...</div>;
  }

  if (!authToken) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>AI Multichat Login</h1>
        {authLoading && <p>Authenticating with Google...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!authLoading && (
          <button onClick={handleGoogleLoginClick} disabled={!GOOGLE_CLIENT_ID}>
            Login with Google
          </button>
        )}
        {!GOOGLE_CLIENT_ID && <p style={{ color: 'orange', marginTop: '10px' }}>Google Client ID not configured.</p>}
      </div>
    );
  }

  // Now Render the Layout with the new structure
  const identifierToPass = userInfo?.email || userInfo?.username || userInfo?.sub || null;

  // Show loading overlay if loading initial data
  if (loading && models.length === 0 && chatHistory.length === 0) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading initial data...</div>;
  }

  return (
    <Layout
      userEmail={identifierToPass}
      onLogout={handleLogout}
      chatHistory={chatHistory}
      activeThreadId={activeThreadId}
      onNewChat={handleNewChat}
      onSelectThread={handleSelectThread}
      models={models}
      selectedModels={selectedModels}
      onSelectModel={handleSelectModel}
      onSendMessage={handleSendMessage}
      activeMessages={activeThreadMessages}
      threadLoading={threadLoading}
      threadError={threadError}
      isNewChat={activeThreadId === null}
    />
  );
}

export default App;
