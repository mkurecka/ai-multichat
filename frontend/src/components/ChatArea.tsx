import React from 'react';
import Select, { MultiValue } from 'react-select'; // Import react-select
import './ChatArea.css'; // We'll create this for styling
import { Model } from '../services/api'; // Import the Model type

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
  // Add props for messages, loading state, errors etc.
}

const ChatArea: React.FC<ChatAreaProps> = ({
  models,
  selectedModels,
  onSelectModel,
  onSendMessage,
}) => {

  // Placeholder state for message input
  const [messageInput, setMessageInput] = React.useState('');

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
    <div className="chat-area">
      {/* Model Selection Bar */}
      <div className="model-selection-bar">
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
      <div className="message-display-area">
        {selectedCount === 0 ? (
             <div className="start-chatting-placeholder">
                 <h2>Select models and start chatting</h2>
                 <p>Your conversation will appear here.</p>
             </div>
        ) : (
          /* Placeholder for actual messages */
          <p>Chat messages will go here...</p>
          // Map through actual messages here
        )}
      </div>

      {/* Message Input Area */}
      <div className="message-input-area">
         {selectedCount === 0 && (
            <div className="select-model-warning">
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
          disabled={selectedCount === 0} // Disable input if no models are selected
        />
        <button
            onClick={handleSend}
            className="send-button"
            disabled={selectedCount === 0 || !messageInput.trim()} // Disable if no model or no text
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatArea; 