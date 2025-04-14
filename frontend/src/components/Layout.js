import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useLocation } from 'react-router-dom'; // Import Link, Outlet, and useLocation
import './Layout.css'; // We'll create this file next for styling
// Import placeholder components (we'll create these next)
import Sidebar from './Sidebar';
import TemplateListSidebar from './layout/TemplateListSidebar'; // Import new sidebar
// const Layout: React.FC<LayoutProps> = ({ userEmail, onNavigate, onLogout, children }) => {
const Layout = ({ userEmail, onLogout, chatHistory, activeThreadId, onNewChat, onSelectThread }) => {
    const location = useLocation(); // Get current location
    const isTemplatesPage = location.pathname.startsWith('/templates'); // Check if path is /templates
    return (_jsxs("div", { className: "layout-container flex flex-col h-screen", children: [" ", _jsxs("header", { className: "layout-header bg-white shadow-sm flex-shrink-0", children: [" ", _jsx("div", { className: "max-w-full mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex items-center h-16 w-full", children: [_jsxs("div", { className: "flex-shrink-0 flex items-center", children: [_jsx("div", { className: "w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold mr-2", children: "AI" }), _jsx("span", { className: "text-xl font-semibold text-gray-900", children: "MultiChat" })] }), _jsx("div", { className: "flex-grow flex justify-center", children: _jsxs("nav", { className: "flex items-baseline space-x-4", children: [_jsx(Link, { to: "/", className: "text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium", children: "Chat" }), _jsx(Link, { to: "/templates", className: "text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium", children: "Templates" })] }) }), _jsxs("div", { className: "flex-shrink-0 flex items-center", children: [" ", _jsx("span", { className: "text-sm text-gray-700 mr-4", children: userEmail || 'User' }), _jsx("button", { onClick: onLogout, className: "logout-button inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50", children: "Logout" })] })] }) })] }), _jsxs("div", { className: "layout-main flex flex-1 overflow-hidden", children: [" ", _jsx("aside", { className: "layout-sidebar w-64 bg-white shadow-md flex flex-col flex-shrink-0", children: isTemplatesPage ? (
                        // Render Template Sidebar on /templates page
                        _jsx(TemplateListSidebar, {})) : (
                        // Render Chat History Sidebar on other pages (e.g., /)
                        // Only render if props are provided
                        chatHistory && onNewChat && onSelectThread && (_jsx(Sidebar, { chatHistory: chatHistory, activeThreadId: activeThreadId ?? null, onNewChat: onNewChat, onSelectThread: onSelectThread }))) }), _jsxs("main", { className: "layout-chat-area flex-1 overflow-y-auto bg-gray-100 p-4", children: [" ", _jsx(Outlet, {}), " "] })] })] }));
};
export default Layout;
