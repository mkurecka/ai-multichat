import React, { useEffect, useRef } from 'react';
import { Message, Model } from '../types';
import ChatMessage from './ChatMessage';
import ModelCheckbox from './ModelCheckbox';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';

interface ChatWindowProps {
  messages: Message[];
  models: Model[];
  onModelToggle: (modelId: string) => void;
  onSendMessage: (messages: Message[], prompt: string) => void;
  isLoading?: boolean;
  maxModels?: number;
}

interface GroupedMessage {
  userMessage: Message;
  responses: Message[];
  timestamp: string;
}

// Check if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const ChatWindow: React.FC<ChatWindowProps> = ({ messages = [], models = [], onModelToggle, onSendMessage, isLoading, maxModels = 16 }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedModels = models.filter(model => model?.selected);

  // Auto scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Group messages by prompt and timestamp
  const groupedMessages: GroupedMessage[] = [];
  
  if (messages?.length > 0) {
    let currentGroup: GroupedMessage | null = null;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (!message) continue;
      
      if (message.role === 'user') {
        // If we have a previous group, add it to our list
        if (currentGroup) {
          groupedMessages.push(currentGroup);
        }
        
        // Start a new group with this user message
        currentGroup = {
          userMessage: message,
          responses: [],
          timestamp: new Date().toISOString()
        };
      } else if (message.role === 'assistant' && currentGroup) {
        // Add assistant message to current group
        currentGroup.responses.push(message);
      }
    }
    
    // Don't forget to add the last group
    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Debug info - only visible in development */}
      {isDevelopment && (
        <div className="bg-yellow-100 p-2 text-xs text-yellow-800">
          Debug: {models.length} models available, {selectedModels.length} selected
        </div>
      )}
      
      {/* Model selector - always visible with prominent styling */}
      <div className="bg-white border-b p-4 shadow-md z-10">
        <h2 className="text-lg font-medium text-gray-800 mb-2">Select AI Models</h2>
        <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
          <ModelSelector 
            models={models} 
            onModelToggle={onModelToggle} 
            maxModels={maxModels} 
          />
        </div>
      </div>

      {/* Model selection bar - only show when models are selected */}
      {selectedModels.length > 0 && (
        <div className="bg-white border-b p-2 flex items-center overflow-x-auto">
          <div className="text-sm font-medium text-gray-500 mr-3">Active models:</div>
          <div className="flex space-x-2">
            {models.filter(model => model?.selected).map(model => (
              <ModelCheckbox
                key={model.id}
                model={model}
                onToggle={() => onModelToggle(model.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chat messages container */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 min-h-0">
        {/* Chat messages */}
        <div className="h-full overflow-y-scroll p-4 space-y-8">
          {!messages?.length ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-center p-8">
              <div>
                <p className="mb-2 text-lg">No messages yet</p>
                <p className="text-sm">Select models and start chatting to see responses</p>
              </div>
            </div>
          ) : (
            <>
              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* User message */}
                  <ChatMessage
                    message={group.userMessage}
                    modelName={undefined}
                  />

                  {/* Model responses in a grid layout */}
                  {group.responses.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Model Responses:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.responses.map((response, responseIndex) => {
                          if (!response) return null;
                          const model = models.find(m => m?.id === response.modelId);
                          return (
                            <div
                              key={responseIndex}
                              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                            >
                              <div className="bg-gray-50 p-2 border-b border-gray-200">
                                <h4 className="font-medium text-sm text-gray-800">{model?.name || 'Unknown Model'}</h4>
                              </div>
                              <div className="p-3 text-sm whitespace-pre-wrap text-gray-800">
                                {typeof response.content === 'string' 
                                  ? response.content 
                                  : typeof response.content === 'object' && response.content !== null
                                    ? response.content.content || JSON.stringify(response.content)
                                    : JSON.stringify(response.content)}
                                {isLoading && responseIndex === group.responses.length - 1 && (
                                  <span className="inline-block ml-1 animate-pulse">▊</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t bg-white">
        <ChatInput
          selectedModels={selectedModels.map(model => model.id)}
          onSendMessage={(message) => onSendMessage(messages, message)}
          disabled={selectedModels.length === 0 || isLoading === true}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Generating response...</span>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;