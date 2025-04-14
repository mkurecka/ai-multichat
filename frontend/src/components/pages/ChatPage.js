import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
// Import necessary API functions and types directly
import { getThreadHistory, sendChatMessage } from '../../services/api';
import ChatArea from '../ChatArea';
import { v4 as uuidv4 } from 'uuid';
const ChatPage = ({ models, activeThreadId }) => {
    // --- STATE MANAGEMENT WITHIN ChatPage --- 
    // Remove state managed by App:
    // const [models, setModels] = useState<Model[]>([]); // Prop now
    // const [chatHistory, setChatHistory] = useState<ChatThread[]>([]); // Managed by App
    // const [activeThreadId, setActiveThreadId] = useState<string | null>(null); // Prop now
    // const [initialDataLoading, setInitialDataLoading] = useState<boolean>(true); // Not needed here
    // Keep state specific to the chat area content:
    const [selectedModels, setSelectedModels] = useState([]);
    const [activeThreadMessages, setActiveThreadMessages] = useState([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadError, setThreadError] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [error, setError] = useState(null); // Keep for page-specific errors like sending message
    // TODO: Access handleLogout via Context
    const handleLogout = useCallback(() => { }, []);
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
                    const modelIdsInThread = new Set();
                    response.messages.forEach(group => {
                        Object.keys(group.responses).forEach(modelId => modelIdsInThread.add(modelId));
                    });
                    // Use models prop passed down from App
                    const modelsToSelect = models.filter(model => modelIdsInThread.has(model.id));
                    setSelectedModels(modelsToSelect);
                }
            }
            catch (err) { /* ... error handling ... */ }
            finally {
                if (isMounted)
                    setThreadLoading(false);
            }
        };
        fetchThread();
        return () => { isMounted = false; };
    }, [activeThreadId, models, handleLogout]); // Depend on activeThreadId prop and models prop
    // --- REMOVE HANDLERS managed by App --- 
    // const handleSelectThread = useCallback(/* ... */); 
    // const handleNewChat = useCallback(/* ... */); 
    // --- KEEP HANDLERS specific to ChatPage --- 
    const handleSelectModel = useCallback((selectedOptions) => {
        const limitedSelection = selectedOptions.slice(0, 16);
        setSelectedModels(limitedSelection.map(option => option.model));
    }, []);
    const handleSendMessage = useCallback(async (message) => {
        // This handler needs the activeThreadId from props now
        // const currentThreadId = activeThreadId; // Use prop
        // ... rest of implementation using props and internal state ...
        // Prepare API Request Data
        const requestData = {
            userInput: message.trim(),
            promptId: uuidv4(),
            threadId: activeThreadId, // Use the prop
            models: selectedModels.map(m => m.id),
        };
        // ... (remove templateId logic if needed) ...
        try {
            const response = await sendChatMessage(requestData);
            // ... update activeThreadMessages state ...
            if (!activeThreadId && response.threadId) {
                // This case shouldn't happen if App manages activeThreadId
                // Maybe need a callback prop to notify App of new thread ID?
                console.warn("ChatPage received new threadId, but App manages activeThreadId");
                // TODO: Determine how to update App's activeThreadId 
            }
        }
        catch (err) { /* ... error handling ... */ }
        finally {
            setSendingMessage(false);
        }
    }, [activeThreadId, selectedModels, sendingMessage, handleLogout]); // Add activeThreadId prop to dependencies
    // --- RENDER LOGIC --- 
    // Remove initialDataLoading check if fetchInitialChatData is gone
    // if (initialDataLoading) { return <div>Loading Chat Data...</div>; }
    if (error) { /* Show page-level error */ }
    // Render ONLY the ChatArea, passing down the state managed within ChatPage
    return (_jsx(ChatArea, { models: models, selectedModels: selectedModels, onSelectModel: handleSelectModel, onSendMessage: handleSendMessage, messages: activeThreadMessages, isLoading: threadLoading || sendingMessage, error: threadError, isNewChat: activeThreadId === null }));
};
export default ChatPage;
