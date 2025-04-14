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
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Template' : 'Create New Template'}</h2>

      {formError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded">{formError}</div>}

      {/* Name Field */}
      <div>
        <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">Name:</label>
        <input id="template-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="template-description" className="block text-sm font-medium text-gray-700">Description (Optional):</label>
        <input id="template-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      {/* Scope Field */}
      <div>
        <span className="block text-sm font-medium text-gray-700">Scope:</span>
        <div className="mt-2 space-x-4">
          <label className="inline-flex items-center">
            <input type="radio" value="private" checked={scope === 'private'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting} className="form-radio h-4 w-4 text-indigo-600" />
            <span className="ml-2 text-sm text-gray-700">Private</span>
          </label>
          <label className="inline-flex items-center">
            <input type="radio" value="organization" checked={scope === 'organization'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting} className="form-radio h-4 w-4 text-indigo-600" />
            <span className="ml-2 text-sm text-gray-700">Organization</span>
          </label>
        </div>
      </div>

      {/* Associated Model Field */}
      <div>
        <label htmlFor="template-model" className="block text-sm font-medium text-gray-700">Associated Model:</label>
        <select id="template-model" value={associatedModelId} onChange={(e) => setAssociatedModelId(e.target.value)} required disabled={isSubmitting || availableModels.length === 0} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
           {availableModels.length === 0 && <option value="" disabled>Loading models...</option>}
           {availableModels.map(model => (
            <option key={model.id} value={model.id}>{model.name} ({model.id})</option>
           ))}
        </select>
      </div>

      {/* Messages List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Messages</h3>
        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className="flex items-start space-x-2 p-3 border rounded bg-gray-50">
              <div className="flex-shrink-0">
                <select
                  value={msg.role}
                  onChange={(e) => handleMessageChange(index, 'role', e.target.value)}
                  disabled={isSubmitting}
                  className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
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
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={`Enter ${msg.role} content...`}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleRemoveMessage(index)}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
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
          className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          Add Message
        </button>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Template' : 'Create Template')}
        </button>
      </div>
    </form>
  );
};

export default TemplateForm;