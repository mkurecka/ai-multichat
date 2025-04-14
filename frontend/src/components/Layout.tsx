import React from 'react';
import './Layout.css'; // We'll create this file next for styling
// Import placeholder components (we'll create these next)
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { Model, ChatThread, MessageGroup } from '../services/api'; // Import necessary types
import { MultiValue } from 'react-select';

// Define the option type used in ChatArea
interface ModelOptionType {
  value: string;
  label: string;
  model: Model;
}

interface LayoutProps {
  userEmail: string | null;
  // onNavigate: (view: 'models' | 'chats' | 'settings') => void; // Removing old navigation
  onLogout: () => void;
  // children: React.ReactNode; // Replacing children with specific components
  // Pass necessary data/handlers down later
  chatHistory: ChatThread[]; // Use specific type
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  models: Model[]; // Example: Pass models to ChatArea
  selectedModels: Model[]; // Example: Pass selected models
  onSelectModel: (selectedOptions: MultiValue<ModelOptionType>) => void;
  onSendMessage: (message: string) => void;
  activeMessages: MessageGroup[];
  threadLoading: boolean;
  threadError: string | null;
  isNewChat: boolean;
}

// const Layout: React.FC<LayoutProps> = ({ userEmail, onNavigate, onLogout, children }) => {
const Layout: React.FC<LayoutProps> = ({
  userEmail,
  onLogout,
  chatHistory,
  activeThreadId,
  onNewChat,
  onSelectThread,
  models,
  selectedModels,
  onSelectModel,
  onSendMessage,
  activeMessages,
  threadLoading,
  threadError,
  isNewChat
}) => {
  return (
    <div className="layout-container">
      {/* Updated Header */}
      <header className="layout-header">
        <div className="header-logo">AI MultiChat</div>
        {/* Removed old nav buttons */}
        <div className="header-user-info">
          <span>{userEmail || 'User'}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>
      {/* New Main Structure: Sidebar + ChatArea */}
      <div className="layout-main">
        <aside className="layout-sidebar">
           {/* Pass necessary props to Sidebar */}
           <Sidebar
             chatHistory={chatHistory}
             activeThreadId={activeThreadId}
             onNewChat={onNewChat}
             onSelectThread={onSelectThread}
           />
        </aside>
        <main className="layout-chat-area">
           {/* Pass necessary props to ChatArea */}
           <ChatArea
             models={models}
             selectedModels={selectedModels}
             onSelectModel={onSelectModel}
             onSendMessage={onSendMessage}
             messages={activeMessages}
             isLoading={threadLoading}
             error={threadError}
             isNewChat={isNewChat}
           />
        </main>
      </div>
      {/* Footer can be kept or removed based on final design preference */}
      {/*
      <footer className="layout-footer">
        <p>&copy; 2025 AI Multichat</p>
      </footer>
      */}
    </div>
  );
};
export default Layout;

