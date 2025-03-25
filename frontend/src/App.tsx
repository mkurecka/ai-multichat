import { useState, useEffect } from 'react';
import { Message, Model, ChatSession } from './types';
import { getModels, getChatHistory, sendMessageToModels } from './services/api';
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatHistory from './components/ChatHistory';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const MAX_MODELS = 16;

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const fetchedModels = await getModels();
        setModels(
            fetchedModels.map((model: Model) => ({
              ...model,
              selected: false,
              description: model.description || 'No description available',
              provider: model.provider || 'Unknown provider',
            }))
        );
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
          title: entry.prompt,
          messages: [
            { role: 'user', content: entry.prompt },
            ...Object.entries(entry.responses).map(([modelId, content]) => ({
              role: 'assistant',
              content: content as string,
              modelId,
            })),
          ],
          selectedModels: [], // We'll populate this when starting a new chat
        }));
        setChatHistory(sessions);
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      }
    };

    fetchChatHistory();
  }, []);

  // Load messages for the current session
  useEffect(() => {
    if (currentSessionId) {
      const session = chatHistory.find(session => session.id === currentSessionId);
      if (session && session.messages) {
        setMessages(session.messages);
        // Restore selected models for this session
        setModels(prevModels =>
            prevModels.map(model => ({
              ...model,
              selected: session.selectedModels.includes(model.id),
            }))
        );
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId, chatHistory]);

  const handleModelToggle = (modelId: string) => {
    setModels(prevModels =>
        prevModels.map(model =>
            model.id === modelId ? { ...model, selected: !model.selected } : model
        )
    );
  };

  const handleSendMessage = async (responses: Message[], prompt: string) => {
    const userMessage: Message = { role: 'user', content: prompt };
    const updatedMessages = [...messages, userMessage, ...responses];
    setMessages(updatedMessages);

    const selectedModelIds = models.filter(model => model.selected).map(model => model.id);

    // Update the current session or create a new one
    if (currentSessionId) {
      setChatHistory(prevHistory =>
          prevHistory.map(session =>
              session.id === currentSessionId
                  ? { ...session, messages: updatedMessages, selectedModels: selectedModelIds }
                  : session
          )
      );
    } else {
      const newSession: ChatSession = {
        id: Date.now().toString(), // Temporary ID (backend provides real ID)
        title: prompt,
        messages: updatedMessages,
        selectedModels: selectedModelIds,
      };
      setChatHistory(prev => [...prev, newSession]);
      setCurrentSessionId(newSession.id);
    }
  };

  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setModels(models.map(model => ({ ...model, selected: false })));
  };

  const handleSelectChat = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const selectedModelsCount = models.filter(model => model.selected).length;
  const canChat = selectedModelsCount > 0;
  const hasMessages = messages.length > 0;

  const toggleModelSelector = () => {
    setShowModelSelector(prev => !prev);
  };

  const toggleChatHistory = () => {
    setShowChatHistory(prev => !prev);
  };

  return (
      <div className="flex h-screen max-h-screen overflow-hidden">
        {/* Chat History Sidebar */}
        <div className={`bg-white border-r flex flex-col transition-all duration-300 ${showChatHistory ? 'w-72' : 'w-0'}`}>
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
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-r-md p-1 shadow-sm z-10"
        >
          {showChatHistory ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <header className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Multi-Model Chat</h1>
            <button
                onClick={toggleModelSelector}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              {showModelSelector ? 'Hide Models' : 'Show Models'}
            </button>
          </header>

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