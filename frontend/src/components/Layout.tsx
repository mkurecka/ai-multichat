import React from 'react';
import './Layout.css'; // We'll create this file next for styling

interface LayoutProps {
  userEmail: string | null;
  onNavigate: (view: 'models' | 'chats' | 'settings') => void;
  onLogout: () => void;
  children: React.ReactNode; // To render the main content
}

const Layout: React.FC<LayoutProps> = ({ userEmail, onNavigate, onLogout, children }) => {
  return (
    <div className="layout-container">
      <header className="layout-header">
        <div className="header-logo">AI Multichat</div>
        <nav className="header-nav">
          <button onClick={() => onNavigate('models')}>Models</button>
          <button onClick={() => onNavigate('chats')}>Chats</button>
          <button onClick={() => onNavigate('settings')}>Settings</button>
        </nav>
        <div className="header-user-info">
          {/* Layout only renders if authenticated, so always show user info + logout */}
          <span>{userEmail || 'User'}</span> {/* Display email/username or fallback to 'User' */}
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>
      <main className="layout-main-content">
        {children}
      </main>
      <footer className="layout-footer">
        <p>&copy; 2025 AI Multichat</p>
      </footer>
    </div>
  );
};

export default Layout;
