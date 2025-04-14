import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import Select from 'react-select'; // Import react-select
import './ChatArea.css'; // We'll create this for styling
const ChatArea = ({ models, selectedModels, onSelectModel, onSendMessage, 
// Thread-specific props
messages, isLoading, error, isNewChat }) => {
    // Ref for the scrollable message area
    const messagesEndRef = useRef(null);
    // Placeholder state for message input
    const [messageInput, setMessageInput] = React.useState('');
    // Function to scroll to the bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
    };
    // Effect to scroll down when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    const handleSend = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput);
            setMessageInput('');
        }
    };
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default Enter behavior (new line)
            handleSend();
        }
    };
    const selectedCount = selectedModels.length;
    // Format models for react-select
    const modelOptions = models.map(model => ({
        value: model.id,
        label: `${model.name} (${model.provider})`,
        model: model
    }));
    // Format selectedModels for react-select's value prop
    const selectedValue = selectedModels.map(model => ({
        value: model.id,
        label: `${model.name} (${model.provider})`,
        model: model
    }));
    return (_jsxs("div", { className: "chat-area flex flex-col h-full", children: [_jsxs("div", { className: "model-selection-bar flex-shrink-0", children: [_jsxs("div", { className: "available-models-section", children: [_jsx("h3", { children: "Available Models" }), _jsx(Select, { isMulti: true, options: modelOptions, value: selectedValue, onChange: onSelectModel, placeholder: "Search or select models...", className: "model-select-container", classNamePrefix: "model-select", closeMenuOnSelect: false, isDisabled: models.length === 0, 
                                // Filter out already selected options from the dropdown
                                filterOption: (option, rawInput) => {
                                    const isSelected = selectedValue.some(selected => selected.value === option.value);
                                    if (isSelected)
                                        return false; // Don't show already selected options
                                    // Default filtering logic (case-insensitive)
                                    const inputValue = rawInput.toLowerCase();
                                    const candidate = option.label.toLowerCase();
                                    return candidate.includes(inputValue);
                                } }), selectedCount === 0 && models.length > 0 && (_jsx("span", { className: "no-models-selected-message", children: "Select one or more models to begin." }))] }), _jsxs("div", { className: "selected-count", children: [selectedCount, "/16 selected"] })] }), _jsxs("div", { ref: messagesEndRef, className: "message-display-area flex-grow overflow-y-auto p-4 space-y-4", children: [isLoading && (_jsx("div", { className: "loading-placeholder", children: "Loading messages..." })), !isLoading && error && (_jsxs("div", { className: "error-placeholder", children: ["Error: ", error] })), !isLoading && !error && isNewChat && (_jsxs("div", { className: "start-chatting-placeholder", children: [_jsx("h2", { children: "Select models and start chatting" }), _jsx("p", { children: "Your conversation will appear here." })] })), !isLoading && !error && !isNewChat && messages.length === 0 && (_jsx("div", { className: "loading-placeholder", children: "No messages in this chat yet." })), !isLoading && !error && !isNewChat && messages.length > 0 && (_jsx("div", { className: "messages-list", children: messages.map((group, index) => (_jsxs("div", { className: "message-group", children: [_jsxs("div", { className: "message user-message", children: [_jsx("span", { className: "message-role", children: "User:" }), _jsx("div", { className: "message-content", children: group.prompt })] }), _jsx("div", { className: "ai-responses-container", children: Object.entries(group.responses).map(([modelId, response]) => (_jsxs("div", { className: "message ai-message ai-response-block", children: [_jsxs("span", { className: "message-role", children: [models.find(m => m.id === modelId)?.name || modelId, ":"] }), _jsx("div", { className: "message-content", children: response.content }), response.usage && (_jsxs("div", { className: "token-usage", children: ["Tokens: ", response.usage.total_tokens, " (P: ", response.usage.prompt_tokens, " | C: ", response.usage.completion_tokens, ")"] })), response.error && (_jsxs("div", { className: "response-error", children: ["Error: ", response.error] }))] }, modelId))) })] }, group.promptId || index))) }))] }), _jsxs("div", { className: "message-input-area mt-auto flex-shrink-0 p-4 border-t border-gray-200", children: [selectedCount === 0 && (_jsx("div", { className: "select-model-warning text-red-600 mb-2", children: "\u26A0 Select at least one model to start chatting" })), _jsx("textarea", { value: messageInput, onChange: (e) => setMessageInput(e.target.value), onKeyDown: handleKeyDown, placeholder: selectedCount > 0 ? "Type your message here... (Shift+Enter for new line)" : "Select a model first", rows: 3, className: "message-input-textarea", disabled: selectedCount === 0 || isLoading }), _jsx("button", { onClick: handleSend, className: "send-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50", disabled: selectedCount === 0 || !messageInput.trim() || isLoading, children: "Send" })] })] }));
};
export default ChatArea;
