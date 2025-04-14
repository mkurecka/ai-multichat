import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getModels, Model, getAuthToken, logoutUser, handleGoogleCallback, API_BASE_URL, getChatHistory, ChatThread, getThreadHistory, ThreadHistoryResponse, sendChatMessage } from './services/api';
import Layout from './components/Layout';
import './App.css';
import axios from 'axios';
import { MultiValue } from 'react-select';
import { v4 as uuidv4 } from 'uuid';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import ChatPage from './components/pages/ChatPage';
import PromptTemplatePage from './components/pages/PromptTemplatePage';
import LoginPage from './components/pages/LoginPage';

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
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
  const [loading, setLoading] = useState<boolean>(false); // Restore global loading potentially

  const OAUTH_CALLBACK_PATH = '/auth/google/callback';
  const calculatedRedirectUri = window.location.origin + OAUTH_CALLBACK_PATH;

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
  }, [processToken]);

  const handleGoogleLoginCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !authToken && !authLoading) {
      setAuthLoading(true);
      setError(null);
      handleGoogleCallback(code, calculatedRedirectUri)
        .then(receivedToken => {
          processToken(receivedToken);
          if (!receivedToken) {
            setError("Login failed: No token received after Google callback.");
          }
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
  }, [authToken, authLoading, processToken, calculatedRedirectUri]);

  const GoogleCallbackHandler = () => {
    useEffect(() => {
      handleGoogleLoginCallback();
    }, [handleGoogleLoginCallback]);
    return <div>Processing login...</div>;
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
     if (!currentToken || loading) return;
     console.log("App: Fetching initial models and history...");
     setLoading(true);
     setError(null);
     try {
       const [fetchedModels, fetchedHistory] = await Promise.all([
         getModels(),
         getChatHistory(),
       ]);
       setModels(fetchedModels);
       setChatHistory(fetchedHistory);
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
    <BrowserRouter>
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
              >
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<ChatPage models={models} activeThreadId={activeThreadId} />} />
          <Route path="templates" element={<PromptTemplatePage models={models} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
