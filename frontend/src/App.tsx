import React, { useState, useEffect, useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getModels, Model, getAuthToken, logoutUser, handleGoogleCallback, API_BASE_URL, getChatHistory, ChatThread, getThreadHistory, ThreadHistoryResponse, sendChatMessage, PromptTemplate, getAllPromptTemplates } from './services/api';
import Layout from './components/Layout';
import './App.css';
import axios from 'axios';
import { MultiValue } from 'react-select';
import { v4 as uuidv4 } from 'uuid';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import ChatPage, { ChatPageProps } from './components/pages/ChatPage';
import PromptTemplatePage, { PromptTemplatePageProps } from './components/pages/PromptTemplatePage';
import LoginPage from './components/pages/LoginPage';
import TemplateEditor from './components/pages/TemplateEditor';

// --- Google Auth Config ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI_BASE = window.location.origin; // Base URI without path

// Export the interface
export interface JwtPayload {
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

// --- Protected Route Component ---
// Use React.PropsWithChildren for standard child prop typing
const ProtectedRoute = ({ children }: React.PropsWithChildren) => {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  // TODO: Add token expiration check here
  return children;
};

function App() {
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Add Back Chat History / Active Thread State ---
  const [chatHistory, setChatHistory] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  // Keep models state here if needed globally or by multiple pages via props/context
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const isFetchingInitialData = useRef(false);

  const OAUTH_CALLBACK_PATH = '/auth/google/callback';
  const calculatedRedirectUri = window.location.origin + OAUTH_CALLBACK_PATH;

  // Get the navigate function
  const navigate = useNavigate();

  const processToken = useCallback((token: string | null) => {
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUserInfo(decoded);
        setAuthToken(token);
        console.log("Decoded JWT:", decoded);
        localStorage.setItem('authToken', token);
      } catch (e) {
        console.error("Failed to decode JWT:", e);
        setUserInfo(null);
        setAuthToken(null);
        localStorage.removeItem('authToken');
      }
    } else {
      setUserInfo(null);
      setAuthToken(null);
      localStorage.removeItem('authToken');
    }
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    processToken(null);
    setError(null);
    // Clear chat state on logout
    setChatHistory([]);
    setActiveThreadId(null);
    setModels([]);
    setPromptTemplates([]); // Clear templates on logout
  }, [processToken]);

  const handleGoogleLoginCallback = useCallback(async () => {
    console.log("GoogleCallbackHandler: Entered handleGoogleLoginCallback"); // Log Entry
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    console.log(`GoogleCallbackHandler: Found code: ${code}`); // Log Code

    // Add check: Only proceed if code exists, not already authenticated, and not already loading
    if (code && !authToken && !authLoading) {
      console.log("GoogleCallbackHandler: Conditions met, proceeding with auth..."); // Log Proceeding
      setAuthLoading(true);
      setError(null);

      console.log("GoogleCallbackHandler: Calling backend handleGoogleCallback API..."); // Log API Call
      handleGoogleCallback(code, calculatedRedirectUri)
        .then(receivedToken => {
          console.log(`GoogleCallbackHandler: Backend API returned token: ${receivedToken ? 'Yes' : 'No'}`); // Log Token Received
          processToken(receivedToken);
          if (!receivedToken) {
            console.log("GoogleCallbackHandler: No token received, setting error."); // Log No Token
            setError("Login failed: No token received after Google callback.");
            // Optionally navigate back to login on token failure
            // console.log("GoogleCallbackHandler: Navigating to /login due to no token.");
            // navigate('/login', { replace: true });
          } else {
            // Navigate to home page on success
            console.log("GoogleCallbackHandler: Token received, navigating to /"); // Log Success Navigation
            navigate('/', { replace: true });
          }
          // Clean the URL *after* potential navigation - maybe remove this if router handles it
          // console.log("GoogleCallbackHandler: Attempting to clean URL...");
          // window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          console.error("Google callback handler failed:", err); // Log Error
          setError(err instanceof Error ? err.message : 'Google login failed.');
          processToken(null);
          // Navigate back to homepage on error
          console.log("GoogleCallbackHandler: Error caught, navigating to homepage."); // Log Error Navigation
          navigate('/', { replace: true });
          // Clean the URL *after* potential navigation
          // window.history.replaceState({}, document.title, window.location.pathname);
        })
        .finally(() => {
          console.log("GoogleCallbackHandler: Auth process finished, setting authLoading to false."); // Log Finally
          setAuthLoading(false);
        });
    } else {
      console.log("GoogleCallbackHandler: Conditions not met or already handled.", { codeExists: !!code, authTokenExists: !!authToken, authLoading }); // Log Conditions Not Met
    }
  }, [authToken, authLoading, processToken, calculatedRedirectUri, navigate]);

  const GoogleCallbackHandler = () => {
    console.log("GoogleCallbackHandler: Component rendering/rendered."); // Log Component Render
    useEffect(() => {
      console.log("GoogleCallbackHandler: useEffect triggered."); // Log useEffect Trigger
      handleGoogleLoginCallback();
    }, [handleGoogleLoginCallback]); // Dependency array looks correct

    // Display loading message and any potential error
    return (
        <div>
            Processing login...
            {authLoading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
  };

  // --- Add Back Handlers for Sidebar ---
  const handleSelectThread = useCallback((threadId: string) => {
    console.log("App: Selecting thread:", threadId);
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    // ChatPage will fetch messages based on this ID change (via context/prop)
  }, [activeThreadId]);

  const handleNewChat = useCallback(() => {
    console.log("App: Starting new chat...");
    setActiveThreadId(null);
    // ChatPage will clear its state based on null activeThreadId
  }, []);

  // --- Restore Initial Data Fetching (Models & History) ---
   const fetchInitialData = useCallback(async () => {
     const currentToken = getAuthToken();
     if (!currentToken || isFetchingInitialData.current) return;

     console.log("App: Fetching initial models, history, and templates...");
     isFetchingInitialData.current = true;
     setLoading(true);
     setError(null);
     try {
       const [fetchedModels, fetchedHistory, fetchedTemplates] = await Promise.all([
         getModels(),
         getChatHistory(),
         getAllPromptTemplates(),
       ]);
       setModels(fetchedModels);
       setChatHistory(fetchedHistory);
       setPromptTemplates(fetchedTemplates);
     } catch (err) {
       console.error("App: Failed to fetch initial data:", err);
       if (axios.isAxiosError(err) && err.response?.status === 401) {
         setError("Session expired. Please log in again.");
         handleLogout();
       } else {
         setError(err instanceof Error ? err.message : 'An unknown error occurred fetching initial data');
       }
     } finally {
       setLoading(false);
       isFetchingInitialData.current = false;
     }
   }, [handleLogout]);

   useEffect(() => {
     if (authToken && !authLoading) {
       fetchInitialData();
     }
   }, [authToken, authLoading, fetchInitialData]);

  useEffect(() => {
    const storedToken = getAuthToken();
    processToken(storedToken);
    setIsAuthCheckComplete(true);
  }, [processToken]);

  if (!isAuthCheckComplete) {
    return <div>Loading Authentication...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage googleClientId={GOOGLE_CLIENT_ID} redirectUri={calculatedRedirectUri} />} />
      <Route path={OAUTH_CALLBACK_PATH} element={<GoogleCallbackHandler />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout
              userEmail={userInfo?.email || null}
              onLogout={handleLogout}
              chatHistory={chatHistory}
              activeThreadId={activeThreadId}
              onNewChat={handleNewChat}
              onSelectThread={handleSelectThread}
              promptTemplates={promptTemplates}
              templatesLoading={loading}
              templatesError={error}
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChatPage
          models={models}
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          setChatHistory={setChatHistory}
        />} />
        <Route path="templates" element={<PromptTemplatePage
          models={models}
          templates={promptTemplates}
          setTemplates={setPromptTemplates}
        />} />
        <Route path="templates/:templateId" element={<TemplateEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
