import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import SidebarHeader from './components/layout/SidebarHeader';
// Render the main application
const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(_jsx(StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }));
}
else {
    console.error('Failed to find the root element');
}
// Render the Sidebar Header into its specific placeholder
const sidebarHeaderElement = document.getElementById('react-sidebar-header');
if (sidebarHeaderElement) {
    // Dummy onNewChat function for now
    const handleNewChatPlaceholder = () => {
        console.log('New Chat clicked in SidebarHeader - Placeholder Implementation');
        // TODO: Connect this to the actual new chat logic, possibly via state management or context
        alert('New Chat functionality needs to be connected!');
    };
    createRoot(sidebarHeaderElement).render(_jsx(StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(SidebarHeader, { onNewChat: handleNewChatPlaceholder }) }) }));
}
else {
    // Log a warning if the element isn't found (might not be present on login page, etc.)
    console.warn('Sidebar header placeholder element (#react-sidebar-header) not found. This might be expected if not on the main app layout.');
}
