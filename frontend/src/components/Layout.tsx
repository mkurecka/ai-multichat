import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom'; // Import Link, Outlet, and useLocation
import './Layout.css'; // We'll create this file next for styling
// Import placeholder components (we'll create these next)
import Sidebar from './Sidebar';
import TemplateListSidebar from './layout/TemplateListSidebar'; // Import new sidebar
// Remove ChatArea import, it will be rendered via Outlet
// import ChatArea from './ChatArea';
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
  onLogout: () => void;
  // Make chat props optional, only needed for chat Sidebar
  chatHistory?: ChatThread[]; 
  activeThreadId?: string | null;
  onNewChat?: () => void;
  onSelectThread?: (threadId: string) => void;
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
  chatHistory, 
  activeThreadId, 
  onNewChat, 
  onSelectThread 
}) => {
  const location = useLocation(); // Get current location
  const isTemplatesPage = location.pathname.startsWith('/templates'); // Check if path is /templates

  return (
    <div className="layout-container flex flex-col h-screen"> {/* Use Flexbox for layout */}
      {/* Header */}
      <header className="layout-header bg-white shadow-sm flex-shrink-0"> {/* Standard Header */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main flex container for header items - Align items, let center grow */}
            <div className="flex items-center h-16 w-full">
                {/* Left Section: Logo & App Name */}
                <div className="flex-shrink-0 flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold mr-2">AI</div>
                    <span className="text-xl font-semibold text-gray-900">MultiChat</span>
                </div>

                {/* Center Section: Nav Links - Grows to fill space and centers content */}
                <div className="flex-grow flex justify-center">
                    <nav className="flex items-baseline space-x-4">
                       <Link
                         to="/"
                         className="text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                       >
                         Chat
                       </Link>
                       <Link
                         to="/templates"
                         className="text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                       >
                         Templates
                       </Link>
                       {/* Add other nav links here if needed */}
                    </nav>
                </div>

                {/* Right Section: User Menu - No grow/shrink needed usually */}
                <div className="flex-shrink-0 flex items-center"> {/* Use flex-shrink-0 just in case */}
                  <span className="text-sm text-gray-700 mr-4">{userEmail || 'User'}</span>
                  <button onClick={onLogout} className="logout-button inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Logout</button>
                </div>
            </div>
        </div>
      </header>
      
      {/* Main Content Area - Sidebar + Outlet */}
      <div className="layout-main flex flex-1 overflow-hidden"> {/* Flexbox for main area */} 
        {/* Conditionally Render Sidebar */}
        <aside className="layout-sidebar w-64 bg-white shadow-md flex flex-col flex-shrink-0">
          {isTemplatesPage ? (
            // Render Template Sidebar on /templates page
            <TemplateListSidebar />
          ) : ( 
            // Render Chat History Sidebar on other pages (e.g., /)
            // Only render if props are provided
            chatHistory && onNewChat && onSelectThread && (
              <Sidebar 
                chatHistory={chatHistory} 
                activeThreadId={activeThreadId ?? null} // Ensure null if undefined 
                onNewChat={onNewChat} 
                onSelectThread={onSelectThread} 
              />
            )
          )}
        </aside> 

        {/* Main Content Area where routed components render */} 
        <main className="layout-chat-area flex-1 overflow-y-auto bg-gray-100 p-4"> {/* Let Outlet content control internal layout */} 
           <Outlet /> {/* Routed components (ChatPage, PromptTemplatePage) render here */}
        </main>
      </div>
    </div>
  );
};

export default Layout;

