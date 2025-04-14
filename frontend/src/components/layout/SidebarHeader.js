import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
const SidebarHeader = ({ onNewChat }) => {
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: onNewChat, className: "w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-150", children: "New Chat" }), _jsx(Link, { to: "/templates", className: "block w-full mt-2 px-4 py-2 text-sm text-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors duration-150", children: "Prompt Templates" })] }));
};
export default SidebarHeader;
