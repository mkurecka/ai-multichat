import React from 'react';
import './Sidebar.css'; // We'll create this for styling

interface SidebarProps {
  chatHistory: any[]; // Replace 'any' with your ChatThread type
  onNewChat: () => void;
  // Add other props like onSelectChat, activeChatId etc. as needed
}

const Sidebar: React.FC<SidebarProps> = ({ chatHistory, onNewChat }) => {
  return (
    <div className="sidebar">
      <button className="new-chat-button" onClick={onNewChat}>
        New Chat
      </button>
      <div className="chat-history-list">
        {chatHistory.length === 0 && (
          <p className="no-history-message">No chat history yet.</p>
        )}
        {chatHistory.map((chat, index) => (
          // Replace with your actual chat item component/logic
          <div key={index} className="chat-history-item">
            {chat.title || `Chat ${index + 1}`}
          </div>
        ))}
      </div>
      {/* Add other sidebar elements if needed */}
    </div>
  );
};

export default Sidebar; 