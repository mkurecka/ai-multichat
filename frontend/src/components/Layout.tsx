import React from 'react';
import './Layout.css'; // We'll create this file next for styling
// Import placeholder components (we'll create these next)
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

interface LayoutProps {
  userEmail: string | null;
  // onNavigate: (view: 'models' | 'chats' | 'settings') => void; // Removing old navigation
  onLogout: () => void;
  // children: React.ReactNode; // Replacing children with specific components
  // Pass necessary data/handlers down later
  chatHistory: any[]; // Example: Pass chat history to Sidebar
  models: any[]; // Example: Pass models to ChatArea
  selectedModels: any[]; // Example: Pass selected models
  onSelectModel: (modelId: string) => void; // Example handler
  onSendMessage: (message: string) => void; // Example handler
  onNewChat: () => void; // Example handler
}

// const Layout: React.FC<LayoutProps> = ({ userEmail, onNavigate, onLogout, children }) => {
const Layout: React.FC<LayoutProps> = ({
  userEmail,
  onLogout,
  chatHistory,
  models,
  selectedModels,
  onSelectModel,
  onSendMessage,
  onNewChat
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
           <Sidebar chatHistory={chatHistory} onNewChat={onNewChat} />
        </aside>
        <main className="layout-chat-area">
           {/* Pass necessary props to ChatArea */}
           <ChatArea
             models={models}
             selectedModels={selectedModels}
             onSelectModel={onSelectModel}
             onSendMessage={onSendMessage}
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

