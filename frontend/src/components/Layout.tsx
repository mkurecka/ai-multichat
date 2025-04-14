import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom'; // Import Link, Outlet, and useLocation
import './Layout.css'; // We'll create this file next for styling
// Import placeholder components (we'll create these next)
import Sidebar from './Sidebar';
import TemplateListSidebar from './layout/TemplateListSidebar'; // Import new sidebar
// Remove ChatArea import, it will be rendered via Outlet
// import ChatArea from './ChatArea';
import { Model, ChatThread, MessageGroup, PromptTemplate } from '../services/api'; // Import necessary types
import { MultiValue } from 'react-select';

// Define the option type used in ChatArea
interface ModelOptionType {
  value: string;
  label: string;
  model: Model;
}

interface LayoutProps {
  userEmail: string | null;
  onLogout: () => void;
  // Chat Sidebar props (optional)
  chatHistory?: ChatThread[]; 
  activeThreadId?: string | null;
  onNewChat?: () => void;
  onSelectThread?: (threadId: string) => void;
  // Template Sidebar props (optional)
  promptTemplates?: PromptTemplate[];
  templatesLoading?: boolean;
  templatesError?: string | null;
  // --- Removed Chat Specific Props --- 
  // chatHistory: ChatThread[];
  // activeThreadId: string | null;
  // onNewChat: () => void; // Sidebar might need this, handle differently
  // onSelectThread: (threadId: string) => void; // Sidebar might need this
  // models: Model[];
  // selectedModels: Model[];
  // onSelectModel: (selectedOptions: MultiValue<ModelOptionType>) => void;
  // onSendMessage: (message: string) => void;
  // activeMessages: MessageGroup[];
  // threadLoading: boolean;
  // threadError: string | null;
  // isNewChat: boolean;
  
  // --- Props for Sidebar (if rendered directly by Layout) ---
  // These might need to come from a context or be managed by ChatPage
  // For now, let's assume ChatPage renders its own Sidebar
  // chatHistory?: ChatThread[]; 
  // activeThreadId?: string | null;
  // onNewChat?: () => void;
  // onSelectThread?: (threadId: string) => void;
}

// const Layout: React.FC<LayoutProps> = ({ userEmail, onNavigate, onLogout, children }) => {
const Layout: React.FC<LayoutProps> = ({ 
  userEmail, 
  onLogout, 
  // Chat props
  chatHistory, 
  activeThreadId, 
  onNewChat, 
  onSelectThread, 
  // Template props
  promptTemplates,
  templatesLoading,
  templatesError
}) => {
  const location = useLocation(); // Get current location
  const isTemplatesPage = location.pathname.startsWith('/templates'); // Check if path is /templates

  return (
    <div className="layout-container">
      {/* Header */}
      <header className="layout-header">
        {/* Logo and App Name */}
        <div className="header-logo">
          <Link to="/" className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold mr-2">
              AI
            </div>
            <span>MultiChat</span>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex items-center space-x-6">
          <Link
            to="/"
            className={`${location.pathname === '/' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
          >
            Chat
          </Link>
          <Link
            to="/templates"
            className={`${location.pathname === '/templates' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
          >
            Templates
          </Link>
        </nav>
        
        {/* User Info and Logout */}
        <div className="header-user-info flex items-center space-x-4 mr-4"> {/* Added flex, spacing, and margin */}
          <span>{userEmail || 'User'}</span>
          <button 
            onClick={onLogout} 
            className="logout-button bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors" // Added basic button styling
          >
            Logout
          </button>
        </div>
      </header>
      
      {/* Main Content Area - Sidebar + Outlet */}
      <div className="layout-main">
        {/* Sidebar */}
        <aside className="layout-sidebar">
          {isTemplatesPage ? (
            <TemplateListSidebar 
              templates={promptTemplates || []}
              loading={templatesLoading || false}
              error={templatesError || null}
            />
          ) : (
            chatHistory && onNewChat && onSelectThread && (
              <Sidebar 
                chatHistory={chatHistory} 
                activeThreadId={activeThreadId ?? null}
                onNewChat={onNewChat} 
                onSelectThread={onSelectThread} 
              />
            )
          )}
        </aside> 

        {/* Main Content Area */}
        <main className="layout-chat-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
