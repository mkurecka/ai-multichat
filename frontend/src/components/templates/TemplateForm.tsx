import React, { useState, useEffect } from 'react';
import { PromptTemplate, PromptTemplateMessage, Model } from '../../services/api';

// Define the expected structure for form data submission (subset of PromptTemplate)
export interface TemplateFormData {
    name: string;
    description?: string;
    scope: 'private' | 'organization';
    associatedModelId: string; // Just the ID for the dropdown
    messages: PromptTemplateMessage[]; // Array of messages
}

interface TemplateFormProps {
  onSubmit: (formData: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: PromptTemplate | null;
  isSubmitting: boolean;
  availableModels: Model[]; // Added prop for model dropdown
}

const defaultMessages: PromptTemplateMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
];

const TemplateForm: React.FC<TemplateFormProps> = ({ onSubmit, onCancel, initialData, isSubmitting, availableModels }) => {
  // --- State for Form Fields ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'private' | 'organization'>('private');
  const [associatedModelId, setAssociatedModelId] = useState<string>('');
  // --- NEW: State for messages array ---
  const [messages, setMessages] = useState<PromptTemplateMessage[]>([]);
  const [formError, setFormError] = useState<string | null>(null); // General form error

  const isEditing = !!initialData;

  // --- Populate Form on Edit or Set Defaults ---
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setScope(initialData.scope);
      const modelId = typeof initialData.associatedModel === 'object' && initialData.associatedModel !== null && 'id' in initialData.associatedModel
                      ? initialData.associatedModel.id
                      : '';
      setAssociatedModelId(modelId);
      setMessages(initialData.messages || []); // Use initial messages or empty array
      setFormError(null);
    } else {
      // Reset form for new entry
      setName('');
      setDescription('');
      setScope('private');
      setAssociatedModelId(availableModels.length > 0 ? availableModels[0].id : ''); // Default to first model
      setMessages(defaultMessages); // Start with default messages for new templates
      setFormError(null);
    }
  }, [initialData, availableModels]);

  // --- Message Handlers ---
  const handleMessageChange = (index: number, field: keyof PromptTemplateMessage, value: string) => {
    const newMessages = [...messages];
    // Type assertion needed because field could be 'id' which we don't handle here, but fine for 'role'/'content'
    (newMessages[index] as any)[field] = value;
    setMessages(newMessages);
  };

  const handleAddMessage = () => {
    setMessages([...messages, { role: 'user', content: '' }]);
  };

  const handleRemoveMessage = (index: number) => {
    const newMessages = messages.filter((_, i) => i !== index);
    setMessages(newMessages);
  };

  // --- Handle Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous errors

    if (!name || !associatedModelId) {
      setFormError('Please fill in Name and select an Associated Model.');
      return;
    }

    if (messages.length === 0) {
      setFormError('Please add at least one message.');
      return;
    }

    // Basic validation for message content
    if (messages.some(msg => !msg.content?.trim())) {
       setFormError('All messages must have content.');
       return;
    }


    const formData: TemplateFormData = {
        name,
        description: description || undefined, // Send undefined if empty
        scope,
        associatedModelId,
        messages: messages.map(({ id, ...msg }) => msg) // Ensure IDs are not sent when creating/updating
    };

    try {
      await onSubmit(formData);
    } catch (error) {
        console.error("Form submission error propagated to parent:", error);
        setFormError(error instanceof Error ? error.message : 'Submission failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit Template' : 'Create New Template'}</h2>

      {formError && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{formError}</div>}

      <div>
        <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">Name:</label>
        <input id="template-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting}
               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50" />
      </div>

      <div>
        <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional):</label>
        <input id="template-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting}
               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50" />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Scope:</span>
        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" value="private" checked={scope === 'private'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting}
                   className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:opacity-50" />
            <span className="text-sm text-gray-700">Private</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" value="organization" checked={scope === 'organization'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting}
                   className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:opacity-50" />
            <span className="text-sm text-gray-700">Organization</span>
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="template-model" className="block text-sm font-medium text-gray-700 mb-1">Associated Model:</label>
        <select id="template-model" value={associatedModelId} onChange={(e) => setAssociatedModelId(e.target.value)} required disabled={isSubmitting || availableModels.length === 0}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-50">
           {availableModels.length === 0 && <option value="" disabled>Loading models...</option>}
           {availableModels.map(model => (
            <option key={model.id} value={model.id}>{model.name} ({model.id})</option>
           ))}
        </select>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Messages</h3>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-md bg-gray-50 shadow-sm">
              <div className="flex-shrink-0 mt-1">
                <select
                  value={msg.role}
                  onChange={(e) => handleMessageChange(index, 'role', e.target.value)}
                  disabled={isSubmitting}
                  className="w-28 block px-2 py-1.5 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="system">System</option>
                  <option value="user">User</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div className="flex-grow">
                <textarea
                  value={msg.content}
                  onChange={(e) => handleMessageChange(index, 'content', e.target.value)}
                  required
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                  placeholder={`Enter ${msg.role} content...`}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex-shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => handleRemoveMessage(index)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddMessage}
          disabled={isSubmitting}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Add Message
        </button>
      </div>

      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
        <button type="button" onClick={onCancel} disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
                className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Template' : 'Create Template')}
        </button>
      </div>
    </form>
  );
};

export default TemplateForm;