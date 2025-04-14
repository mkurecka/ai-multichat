import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarHeaderProps {
  onNewChat: () => void; // Callback to handle new chat action
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onNewChat }) => {
  return (
    <>
      <button
        type="button"
        onClick={onNewChat}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-150"
      >
        New Chat
      </button>
      <Link
        to="/templates"
        className="block w-full mt-2 px-4 py-2 text-sm text-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors duration-150"
      >
        Prompt Templates
      </Link>
    </>
  );
};

export default SidebarHeader; 