import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getModels, Model, getAuthToken, logoutUser, handleGoogleCallback, API_BASE_URL, getChatHistory, ChatThread } from './services/api'; // Added getChatHistory and ChatThread
import Layout from './components/Layout'; // Import the Layout component
import './App.css';
import axios from 'axios'; // Ensure axios is imported for error checking

// --- Google Auth Config ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// This should match the 'Authorized redirect URIs' in your Google Cloud Console for the Client ID
// For Vite dev server, it's usually the root URL. For production, it will be your deployed app's URL.
const REDIRECT_URI = window.location.origin + window.location.pathname;

// Define an interface for the expected JWT payload
// Adjust fields based on your actual backend JWT structure (e.g., 'username' or 'email')
interface JwtPayload {
  username?: string;
  email?: string;
  sub?: string; // Add the 'sub' field (Subject/User ID)
  roles?: string[];
  iat?: number;
  exp?: number;
  // Add other fields as needed
}


function App() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // For general data loading
  const [authLoading, setAuthLoading] = useState<boolean>(false); // Specifically for Google callback process
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState<boolean>(false); // Tracks initial token check
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);
  const [currentView, setCurrentView] = useState<'models' | 'chats' | 'settings'>('chats'); // State for current view, default to 'chats'
  const [chatHistory, setChatHistory] = useState<ChatThread[]>([]); // State for chat history

  // Function to decode token and update state
  const processToken = useCallback((token: string | null) => {
    if (token) {
      try {
        // Attempt decoding FIRST
        const decoded = jwtDecode<JwtPayload>(token);
        // Only set states if decoding succeeds
        setUserInfo(decoded);
        setAuthToken(token); // Set the valid token string
        console.log("Decoded JWT:", decoded);
      } catch (e) {
        console.error("Failed to decode JWT:", e);
        // Explicitly set everything to null on failure
        setUserInfo(null);
        setAuthToken(null); // Ensure authToken is null if decode fails
        localStorage.removeItem('authToken');
      }
    } else {
      // Token is null or undefined initially
      setUserInfo(null);
      setAuthToken(null);
    }
  }, []);


  // Initialize auth state from localStorage on mount and mark check as complete
  useEffect(() => {
    const storedToken = getAuthToken();
    processToken(storedToken);
    setIsAuthCheckComplete(true); // Mark the initial check as done
  }, [processToken]); // processToken is stable due to useCallback

  const handleLogout = useCallback(() => {
    logoutUser();
    processToken(null); // Clear token and user info state
    window.history.replaceState({}, document.title, window.location.pathname);
    setModels([]);
    setError(null);
    setCurrentView('chats'); // Reset view on logout
    setModels([]); // Clear models
    setChatHistory([]); // Clear chat history
  }, [processToken]);

  const fetchModelsData = useCallback(async () => {
    const currentToken = getAuthToken(); // Get fresh token in case of async issues
    if (!currentToken) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedModels = await getModels();
      setModels(fetchedModels);
    } catch (err) {
      console.error("Failed to fetch models:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        handleLogout(); // Force logout
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching models');
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]); // Removed authToken dependency as it's checked inside

  const fetchChatHistoryData = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedHistory = await getChatHistory();
      setChatHistory(fetchedHistory);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        handleLogout(); // Force logout
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching chat history');
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);


  // Effect to handle Google callback and fetch data based on auth state and view
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Handle Google Callback
    if (code && !authToken && !authLoading) { // Added !authLoading check here
      setAuthLoading(true);
      setError(null);
      // Pass both code and the REDIRECT_URI used to initiate the login
      handleGoogleCallback(code, REDIRECT_URI)
        .then(receivedToken => {
          processToken(receivedToken); // This will update authToken and trigger the fetch logic below if successful
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
    // Fetch data logic - runs when authToken or currentView changes
    else if (authToken && !authLoading) { // Only proceed if authenticated and not in Google auth callback process
        if (currentView === 'models' && models.length === 0) { // Fetch only if models are empty
            console.log("Effect: Fetching models...");
            fetchModelsData();
        } else if (currentView === 'chats' && chatHistory.length === 0) { // Fetch only if history is empty
            console.log("Effect: Fetching chat history...");
            fetchChatHistoryData();
        }
        // Add logic for 'settings' if needed
    }
    // Clear data if logged out
    else if (!authToken) {
        if (models.length > 0) setModels([]);
        if (chatHistory.length > 0) setChatHistory([]);
    }

  // Dependencies: Only run when auth state or view changes.
  // processToken, fetchModelsData, fetchChatHistoryData are stable callbacks.
  // authLoading prevents fetching during Google callback.
  }, [authToken, currentView, processToken, fetchModelsData, fetchChatHistoryData, authLoading]); // Simplified dependencies


  const handleGoogleLoginClick = () => {
    if (!GOOGLE_CLIENT_ID) {
        setError("Google Client ID is not configured in .env file (VITE_GOOGLE_CLIENT_ID).");
        return;
    }
    // Construct the Google OAuth URL
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'email profile openid', // Request basic profile and email scopes
      // prompt: 'consent', // Optional: force consent screen every time
    });
    // Redirect the user
    window.location.href = `${googleAuthUrl}?${params.toString()}`;
  };

  const handleNavigate = (view: 'models' | 'chats' | 'settings') => {
    setError(null); // Clear errors on navigation
    setCurrentView(view);
    // Fetch data if needed for the new view and not already loaded
    if (view === 'models' && models.length === 0 && !loading) {
        fetchModelsData();
    } else if (view === 'chats' && chatHistory.length === 0 && !loading) {
        fetchChatHistoryData();
    }
    // Add logic for 'settings' view data fetching if required
  };


  // --- Render Logic ---

  // Render loading indicator until initial auth check is complete
  if (!isAuthCheckComplete) {
      console.log("Rendering: Auth check not complete");
      return <div style={{ textAlign: 'center', marginTop: '50px' }}>Checking authentication...</div>;
  }

  // Render Login screen if auth check is complete but no token
  if (!authToken) {
    console.log("Rendering: Login screen");
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
            {!GOOGLE_CLIENT_ID && <p style={{color: 'orange', marginTop: '10px'}}>Google Client ID not configured.</p>}
        </div>
    );
  }

  // Render Layout since auth check is complete and token exists
  const identifierToPass = userInfo?.email || userInfo?.username || userInfo?.sub || null;
  return (
    <Layout
        userEmail={identifierToPass}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
    >
        {/* Conditionally render content based on currentView */}
        {currentView === 'models' && (
            <div className="card">
                <h2>Available Models {import.meta.env.VITE_USE_MOCKS === 'true' ? '(Mocked)' : '(Live API)'}</h2>
                {(loading || authLoading) && <p>Loading models...</p>}
                {error && !authLoading && <p style={{ color: 'red' }}>Error: {error}</p>}
                {!loading && !authLoading && !error && models.length > 0 && (
                <ul>
                    {models.map((model) => (
                    <li key={model.id} style={{ marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px solid #eee' }}>
                        <strong>{model.name}</strong> ({model.provider}) -{' '}
                        {model.description} <br/>
                        {model.pricing && (
                        <small>
                            (Prompt: ${model.pricing.prompt ?? 'N/A'}, Completion: $
                            {model.pricing.completion ?? 'N/A'} per {model.pricing.unit})
                        </small>
                        )}
                        {model.supportsStreaming ? ' (Streaming)' : ''}
                    </li>
                    ))}
                </ul>
                )}
                {!loading && !authLoading && !error && models.length === 0 && (
                    <p>No models found or unable to fetch.</p>
                )}
            </div>
        )}

        {currentView === 'chats' && (
             <div className="card">
                <h2>Chat History</h2>
                 {(loading || authLoading) && <p>Loading chat history...</p>}
                 {error && !authLoading && <p style={{ color: 'red' }}>Error: {error}</p>}
                 {!loading && !authLoading && !error && chatHistory.length > 0 && (
                    <ul>
                        {chatHistory.map((thread) => (
                            <li key={thread.threadId} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                <strong>{thread.title || `Chat ${thread.id}`}</strong> (ID: {thread.threadId}) <br/>
                                <small>Created: {new Date(thread.createdAt).toLocaleString()}</small> <br/>
                                <small>Messages: {thread.messages.length}</small>
                                {/* Add button to view/select thread later */}
                            </li>
                        ))}
                    </ul>
                 )}
                 {!loading && !authLoading && !error && chatHistory.length === 0 && (
                    <p>No chat history found.</p>
                 )}
             </div>
        )}

        {currentView === 'settings' && (
            <div className="card">
                <h2>User Settings</h2>
                <p>Settings section coming soon!</p>
            </div>
        )}

        {/* Common info footer */}
        <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#555', textAlign: 'center' }}>
            {import.meta.env.VITE_USE_MOCKS === 'true'
             ? <>API calls are currently using MOCK data.</>
             : <>API calls are using the LIVE API at <code>{API_BASE_URL}</code>.</>
            }
            <br />
            Edit <code>.env.development</code> (VITE_USE_MOCKS) and restart the dev server to switch modes.
        </p>
    </Layout>
  );
}

export default App;
