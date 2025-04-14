import React, { useState, useEffect, useRef } from 'react';
import Select, { MultiValue } from 'react-select'; // Import react-select
import './ChatArea.css'; // We'll create this for styling
import { Model, MessageGroup } from '../services/api'; // Import the Model type and MessageGroup type

// Define the option type for react-select
interface ModelOptionType {
  value: string;
  label: string;
  model: Model; // Keep original model data
}

interface ChatAreaProps {
  models: Model[]; // Use the imported Model type
  selectedModels: Model[]; // Use the imported Model type
  onSelectModel: (selectedOptions: MultiValue<ModelOptionType>) => void; // Update handler type
  onSendMessage: (message: string) => void;
  // Thread-specific props
  messages: MessageGroup[];
  isLoading: boolean;
  error: string | null;
  isNewChat: boolean; // To show initial placeholder
}

const ChatArea: React.FC<ChatAreaProps> = ({
  models,
  selectedModels,
  onSelectModel,
  onSendMessage,
  // Thread-specific props
  messages,
  isLoading,
  error,
  isNewChat
}) => {

  // Ref for the scrollable message area
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent default Enter behavior (new line)
        handleSend();
    }
  };

  const selectedCount = selectedModels.length;

  // Format models for react-select
  const modelOptions: ModelOptionType[] = models.map(model => ({
    value: model.id,
    label: `${model.name} (${model.provider})`,
    model: model
  }));

  // Format selectedModels for react-select's value prop
  const selectedValue: ModelOptionType[] = selectedModels.map(model => ({
      value: model.id,
      label: `${model.name} (${model.provider})`,
      model: model
  }));

  return (
    <div className="chat-area flex flex-col h-full">
      {/* Model Selection Bar */}
      <div className="model-selection-bar flex-shrink-0">
        <div className="available-models-section">
            <h3>Available Models</h3>
            {/* Replace input/button with react-select */}
            <Select<ModelOptionType, true> // Explicitly type for multi-select
              isMulti
              options={modelOptions}
              value={selectedValue}
              onChange={onSelectModel} // Pass the handler directly
              placeholder="Search or select models..."
              className="model-select-container"
              classNamePrefix="model-select"
              closeMenuOnSelect={false} // Keep menu open for multi-select
              isDisabled={models.length === 0} // Disable if no models loaded
              // Filter out already selected options from the dropdown
              filterOption={(option, rawInput) => {
                const isSelected = selectedValue.some(selected => selected.value === option.value);
                if (isSelected) return false; // Don't show already selected options
                // Default filtering logic (case-insensitive)
                const inputValue = rawInput.toLowerCase();
                const candidate = option.label.toLowerCase();
                return candidate.includes(inputValue);
              }}
            />
            {selectedCount === 0 && models.length > 0 && (
                <span className="no-models-selected-message">
                    Select one or more models to begin.
                </span>
            )}
        </div>
        <div className="selected-count">{selectedCount}/16 selected</div>
      </div>

      {/* Message Display Area */}
      <div ref={messagesEndRef} className="message-display-area flex-grow overflow-y-auto p-4 space-y-4">
        {/* Loading State */} 
        {isLoading && (
          <div className="loading-placeholder">Loading messages...</div>
        )}

        {/* Error State */} 
        {!isLoading && error && (
          <div className="error-placeholder">Error: {error}</div>
        )}

        {/* Initial New Chat State */} 
        {!isLoading && !error && isNewChat && (
             <div className="start-chatting-placeholder">
                 <h2>Select models and start chatting</h2>
                 <p>Your conversation will appear here.</p>
             </div>
        )}

        {/* Display Messages State */} 
        {!isLoading && !error && !isNewChat && messages.length === 0 && (
             <div className="loading-placeholder">No messages in this chat yet.</div>
        )}

        {!isLoading && !error && !isNewChat && messages.length > 0 && (
          <div className="messages-list">
            {messages.map((group, index) => (
              <div key={group.promptId || index} className="message-group">
                 {/* User Prompt */} 
                 <div className="message user-message">
                    <span className="message-role">User:</span>
                    <div className="message-content">{group.prompt}</div>
                 </div>

                 {/* === AI Responses Container (NEW) === */}
                 <div className="ai-responses-container">
                     {Object.entries(group.responses).map(([modelId, response]) => (
                         <div key={modelId} className="message ai-message ai-response-block">
                             <span className="message-role">{models.find(m => m.id === modelId)?.name || modelId}:</span>
                             <div className="message-content">{response.content}</div>
                             {response.usage && (
                                 <div className="token-usage">
                                     Tokens: {response.usage.total_tokens} (P: {response.usage.prompt_tokens} | C: {response.usage.completion_tokens})
                                 </div>
                             )}
                             {response.error && (
                                <div className="response-error">Error: {response.error}</div>
                             )}
                         </div>
                     ))}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="message-input-area mt-auto flex-shrink-0 p-4 border-t border-gray-200">
         {selectedCount === 0 && (
            <div className="select-model-warning text-red-600 mb-2">
                &#x26A0; Select at least one model to start chatting
            </div>
         )}
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCount > 0 ? "Type your message here... (Shift+Enter for new line)" : "Select a model first"}
          rows={3}
          className="message-input-textarea"
          disabled={selectedCount === 0 || isLoading} // Disable input if no models are selected or if loading
        />
        <button
            onClick={handleSend}
            className="send-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            disabled={selectedCount === 0 || !messageInput.trim() || isLoading} // Disable if no model or no text or if loading
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatArea; 