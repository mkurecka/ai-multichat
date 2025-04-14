import React, { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
// Import necessary API functions and types directly
import {
    Model,
    ChatThread,
    MessageGroup,
    getModels, 
    getChatHistory,
    getThreadHistory,
    sendChatMessage,
    ChatRequest
    // Add other necessary imports (like logoutUser if needed via context/event)
} from '../../services/api';
// Import necessary components
import Sidebar from '../Sidebar';
import ChatArea from '../ChatArea';
// Import helper types/functions if needed (e.g., JwtPayload might come from context)
// import { JwtPayload } from '../../App'; 
import { MultiValue } from 'react-select';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Define the option type used in ChatArea
interface ModelOptionType {
  value: string;
  label: string;
  model: Model;
}

// Define props expected from App Router
export interface ChatPageProps { // Export the interface
  models: Model[];
  activeThreadId: string | null; // Receive active thread ID from App
  setActiveThreadId: Dispatch<SetStateAction<string | null>>; // Add setter from App
  setChatHistory: Dispatch<SetStateAction<ChatThread[]>>; // Add setter for history
}

const ChatPage: React.FC<ChatPageProps> = ({ 
  models, 
  activeThreadId, 
  setActiveThreadId, // Receive setter
  setChatHistory // Receive setter
}) => { // Receive props
  // --- STATE MANAGEMENT WITHIN ChatPage --- 
  // Remove state managed by App:
  // const [models, setModels] = useState<Model[]>([]); // Prop now
  // const [chatHistory, setChatHistory] = useState<ChatThread[]>([]); // Managed by App
  // const [activeThreadId, setActiveThreadId] = useState<string | null>(null); // Prop now
  // const [initialDataLoading, setInitialDataLoading] = useState<boolean>(true); // Not needed here
  
  // Keep state specific to the chat area content:
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [activeThreadMessages, setActiveThreadMessages] = useState<MessageGroup[]>([]);
  const [threadLoading, setThreadLoading] = useState<boolean>(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // Keep for page-specific errors like sending message
  
  // TODO: Access handleLogout via Context
  const handleLogout = useCallback(() => { /* ... */ }, []);

  // --- REMOVE DATA FETCHING for models/history (managed by App) ---
  // const fetchInitialChatData = useCallback(/* ... */); 
  // useEffect(() => { fetchInitialChatData(); }, [fetchInitialChatData]);

  // --- Fetch Thread History Effect (modified) ---
  // Fetches messages ONLY when the activeThreadId prop changes
  useEffect(() => {
    if (activeThreadId === null) {
      // Clear state when switching to new chat
      setActiveThreadMessages([]);
      setSelectedModels([]); // Maybe reset models too?
      setThreadLoading(false);
      setThreadError(null);
      setError(null);
      setSendingMessage(false);
      return;
    }

    // Fetch messages for the given activeThreadId
    let isMounted = true;
    const fetchThread = async () => {
      console.log(`ChatPage: Fetching history for thread: ${activeThreadId}`);
      setThreadLoading(true);
      setThreadError(null);
      try {
        const response = await getThreadHistory(activeThreadId);
        if (isMounted) {
          setActiveThreadMessages(response.messages);
          // Pre-select models (logic remains the same)
          const modelIdsInThread = new Set<string>();
          response.messages.forEach(group => {
              Object.keys(group.responses).forEach(modelId => modelIdsInThread.add(modelId));
          });
          // Use models prop passed down from App
          const modelsToSelect = models.filter(model => modelIdsInThread.has(model.id));
          setSelectedModels(modelsToSelect);
        }
      } catch (err) { /* ... error handling ... */ }
      finally {
        if (isMounted) setThreadLoading(false);
      }
    };
    
    fetchThread();
    return () => { isMounted = false; };
  }, [activeThreadId, models]); // Removed handleLogout as it should come from context

  // --- REMOVE HANDLERS managed by App --- 
  // const handleSelectThread = useCallback(/* ... */); 
  // const handleNewChat = useCallback(/* ... */); 

  // --- KEEP HANDLERS specific to ChatPage --- 
  const handleSelectModel = useCallback((selectedOptions: MultiValue<ModelOptionType>) => {
    const limitedSelection = selectedOptions.slice(0, 16);
    setSelectedModels(limitedSelection.map(option => option.model));
  }, []);
  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedModels.length || sendingMessage) return;

    const userInput = message.trim();
    if (!userInput) return;

    const currentThreadId = activeThreadId; // Keep as string | null based on App state
    const newPromptId = uuidv4();

    // Add user message immediately to UI
    const userMessageGroup: MessageGroup = {
        prompt: userInput,
        promptId: newPromptId,
        responses: {}, // Initialize empty responses
        createdAt: new Date().toISOString(), // Add createdAt timestamp
    };
    setActiveThreadMessages(prev => [...prev, userMessageGroup]);

    setSendingMessage(true);
    setError(null);

    const requestData: ChatRequest = {
        userInput: userInput,
        promptId: newPromptId,
        threadId: currentThreadId,
        models: selectedModels.map(m => m.id),
    };

    try {
        const response = await sendChatMessage(requestData);
        console.log("ChatPage: Received response from sendChatMessage:", response);

        // Update the message group with the actual responses (usage is inside each response)
        setActiveThreadMessages(prev => prev.map(group => 
            group.promptId === newPromptId 
            ? { ...group, responses: response.responses /* Usage is inside response.responses */ } 
            : group
        ));

        // If it was a new chat, update the activeThreadId and add to history
        if (!currentThreadId && response.threadId) {
            console.log(`ChatPage: New thread created (${response.threadId}), updating App state.`);
            setActiveThreadId(response.threadId); 
            
            // Add new thread to history (use string ID from response)
            const newThread: ChatThread = {
              id: parseInt(response.threadId, 10), // Convert string ID to number
              title: userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''),
              messages: [], // Start with empty messages in history preview
              threadId: response.threadId, // Keep threadId as string
              createdAt: new Date().toISOString(), // Add createdAt
            };
            setChatHistory(prev => [newThread, ...prev]);
        } else if (currentThreadId) {
          // Update history title (use string ID for comparison with threadId field)
          setChatHistory(prev => 
            prev.map(thread => 
              thread.threadId === currentThreadId // Compare string threadId 
              ? { ...thread, title: userInput.substring(0, 50) + '...' } 
              : thread
            )
          );
        }

    } catch (err) {
        console.error("Failed to send message:", err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
            setError("Session expired. Please log in again.");
            // handleLogout(); // Call context logout
        } else {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        }
        // Remove the optimistic user message if sending failed?
        setActiveThreadMessages(prev => prev.filter(group => group.promptId !== newPromptId));
    } finally {
        setSendingMessage(false);
    }
}, [activeThreadId, selectedModels, sendingMessage, setActiveThreadId, setChatHistory]); // Added setters to dependencies


  // --- RENDER LOGIC --- 
  // Remove initialDataLoading check if fetchInitialChatData is gone
  // if (initialDataLoading) { return <div>Loading Chat Data...</div>; }

  if (error) { /* Show page-level error */ }

  // Render ONLY the ChatArea, passing down the state managed within ChatPage
  return (
     <ChatArea 
       models={models} // Pass down models prop
       selectedModels={selectedModels}
       onSelectModel={handleSelectModel}
       onSendMessage={handleSendMessage}
       messages={activeThreadMessages}
       isLoading={threadLoading || sendingMessage}
       error={threadError}
       isNewChat={activeThreadId === null}
     />
  );
};

export default ChatPage; 