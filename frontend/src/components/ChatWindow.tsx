import React from 'react';
import { Message, Model } from '../types';
import ChatMessage from './ChatMessage';
import ModelCheckbox from './ModelCheckbox';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  messages: Message[];
  models: Model[];
  onModelToggle: (modelId: string) => void;
  onSendMessage: (messages: Message[], prompt: string) => void; // Add this to handle new messages
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, models, onModelToggle, onSendMessage }) => {
  // Get selected models - add null check to prevent error
  const selectedModels = models ? models.filter(model => model.selected) : [];

  // Group messages by user message and responses
  const groupedMessages: { userMessage: Message, responses: Message[] }[] = [];

  if (messages && messages.length > 0) {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      if (message.role === 'user') {
        // Find all assistant responses that follow this user message
        const responses: Message[] = [];
        let j = i + 1;

        while (j < messages.length && messages[j].role === 'assistant') {
          responses.push(messages[j]);
          j++;
        }

        groupedMessages.push({
          userMessage: message,
          responses
        });

        // Skip the responses we've already processed
        i = j - 1;
      }
    }
  }

  return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Model selection bar - add null check */}
        {selectedModels.length > 0 && (
            <div className="bg-white border-b p-2 flex items-center overflow-x-auto">
              <div className="text-sm font-medium text-gray-500 mr-3">Active models:</div>
              <div className="flex space-x-2">
                {models && models.filter(model => model.selected).map(model => (
                    <ModelCheckbox
                        key={model.id}
                        model={model}
                        onToggle={() => onModelToggle(model.id)}
                    />
                ))}
              </div>
            </div>
        )}

        {/* Chat messages - make sure it's scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {!messages || messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-center p-8">
                <div>
                  <p className="mb-2 text-lg">No messages yet</p>
                  <p className="text-sm">Select models and start chatting to see responses</p>
                </div>
              </div>
          ) : (
              groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-4">
                    {/* User message */}
                    <ChatMessage
                        message={group.userMessage}
                        modelName={undefined}
                    />

                    {/* Model responses in a horizontal scrollable container */}
                    {group.responses.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Model Responses:</h3>
                          <div className="overflow-x-auto pb-2">
                            <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
                              {group.responses.map((response, responseIndex) => {
                                const model = models ? models.find(m => m.id === response.modelId) : undefined;
                                return (
                                    <div
                                        key={responseIndex}
                                        className="w-80 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white"
                                    >
                                      <div className="bg-gray-50 p-2 border-b border-gray-200">
                                        <h4 className="font-medium text-sm text-gray-800">{model?.name || 'Unknown Model'}</h4>
                                      </div>
                                      <div className="p-3 text-sm whitespace-pre-wrap text-gray-800">
                                        {response.content}
                                      </div>
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
              ))
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t">
          <ChatInput
              selectedModels={selectedModels.map(model => model.id)}
              onSendMessage={onSendMessage}
              disabled={selectedModels.length === 0}
          />
        </div>
      </div>
  );
};

export default ChatWindow;