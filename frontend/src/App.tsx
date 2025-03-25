import { useState } from 'react';
import { Message, Model, ChatSession } from './types';
import { availableModels } from './data/models';
import ModelSelector from './components/ModelSelector';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const [models, setModels] = useState<Model[]>(availableModels);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(true);
  
  // Mock chat history data
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([
    { id: '1', title: 'Conditional Hiding of Payment Type Fields', messages: [], selectedModels: [] },
    { id: '2', title: 'PHP 8.3 Script for Signup Form with Validation', messages: [], selectedModels: [] },
    { id: '3', title: 'Refactor CrewAI Agent Script', messages: [], selectedModels: [] },
    { id: '4', title: 'AI Beginner\'s Content Plan', messages: [], selectedModels: [] },
    { id: '5', title: 'Setting up dstack to Run Models on RunPod', messages: [], selectedModels: [] },
    { id: '6', title: 'Bash Script to Deploy AI Model on RunPod', messages: [], selectedModels: [] },
    { id: '7', title: 'Modular Application Architecture with React', messages: [], selectedModels: [] },
    { id: '8', title: 'Brno Beats Varnsdorf 3-0 in Chance National League', messages: [], selectedModels: [] },
    { id: '9', title: 'Prompt Tester for Comparing AI Models', messages: [], selectedModels: [] },
    { id: '10', title: 'Product Synchronization Content Management', messages: [], selectedModels: [] },
    { id: '11', title: 'Troubleshooting n8n AI Agent Integration', messages: [], selectedModels: [] },
    { id: '12', title: 'Troubleshooting Docker Mount Error in Container', messages: [], selectedModels: [] },
  ]);
  
  const MAX_MODELS = 16;
  
  const handleModelToggle = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? { ...model, selected: !model.selected } 
          : model
      )
    );
  };
  
  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Get selected models
    const selectedModels = models.filter(model => model.selected);
    
    // Add mock responses from each selected model
    selectedModels.forEach(model => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `This is a mock response from ${model.name} to: "${content}"`,
        modelId: model.id
      };
      
      // Add with a slight delay to simulate real API responses
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 500 + Math.random() * 1000);
    });
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

  const handleStartNewChat = () => {
    setMessages([]);
  };

  const handleSelectChat = (sessionId: string) => {
    // In a real app, this would load the selected chat session
    console.log(`Selected chat session: ${sessionId}`);
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
            />
            
            <div className="p-4 border-t">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={!canChat}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
