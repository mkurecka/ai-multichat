import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './Sidebar.css'; // We'll create this for styling
const Sidebar = ({ chatHistory, activeThreadId, onNewChat, onSelectThread }) => {
    return (_jsxs("div", { className: "sidebar", children: [_jsx("button", { className: "new-chat-button", onClick: onNewChat, children: "New Chat" }), _jsxs("div", { className: "chat-history-list", children: [chatHistory.length === 0 && (_jsx("p", { className: "no-history-message", children: "No chat history yet." })), chatHistory.map((chat) => (
                    // Add onClick handler and dynamic class for active state
                    _jsx("div", { className: `chat-history-item ${chat.threadId === activeThreadId ? 'active' : ''}`, onClick: () => onSelectThread(chat.threadId), children: chat.title || chat.threadId || `Chat ${chat.id}` }, chat.threadId)))] })] }));
};
export default Sidebar;
