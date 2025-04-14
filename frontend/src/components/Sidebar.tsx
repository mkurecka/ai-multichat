import React from 'react';
import './Sidebar.css'; // We'll create this for styling
import { ChatThread } from '../services/api'; // Import ChatThread type

interface SidebarProps {
  chatHistory: ChatThread[]; // Use specific type
  activeThreadId: string | null; // ID of the currently active thread
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void; // Function to call when a thread is clicked
}

const Sidebar: React.FC<SidebarProps> = ({ chatHistory, activeThreadId, onNewChat, onSelectThread }) => {
  return (
    <div className="sidebar">
      <button className="new-chat-button" onClick={onNewChat}>
        New Chat
      </button>
      <div className="chat-history-list">
        {chatHistory.length === 0 && (
          <p className="no-history-message">No chat history yet.</p>
        )}
        {chatHistory.map((chat) => (
          // Add onClick handler and dynamic class for active state
          <div
            key={chat.threadId} // Use threadId as key
            className={`chat-history-item ${chat.threadId === activeThreadId ? 'active' : ''}`}
            onClick={() => onSelectThread(chat.threadId)} // Call handler on click
          >
            {/* Use thread title, fallback to threadId if title is missing */}
            {chat.title || chat.threadId || `Chat ${chat.id}`}
          </div>
        ))}
      </div>
      {/* Add other sidebar elements if needed */}
    </div>
  );
};

export default Sidebar; 