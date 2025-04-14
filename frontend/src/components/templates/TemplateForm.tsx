import React, { useState, useEffect } from 'react';
import { PromptTemplate, PromptTemplateMessage, Model, createPromptTemplate, updatePromptTemplate } from '../../services/api';

// Define the expected structure for form data submission (subset of PromptTemplate)
interface TemplateFormData {
    name: string;
    description?: string;
    scope: 'private' | 'organization';
    associatedModelId: string; // Just the ID for the dropdown
    messages: PromptTemplateMessage[]; // Array of messages
}

interface TemplateFormProps {
  // Adjusted onSubmit/onUpdate to expect the FormData structure
  onSubmit: (formData: TemplateFormData) => Promise<void>;
  onUpdate: (id: number, formData: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: PromptTemplate | null;
  isSubmitting: boolean;
  availableModels: Model[]; // Added prop for model dropdown
}

const TemplateForm: React.FC<TemplateFormProps> = ({ onSubmit, onUpdate, onCancel, initialData, isSubmitting, availableModels }) => {
  // --- State for Form Fields ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'private' | 'organization'>('private');
  const [associatedModelId, setAssociatedModelId] = useState<string>('');
  // Simple approach for messages: JSON string in textarea
  const [messagesString, setMessagesString] = useState<string>('[]');
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const isEditing = !!initialData;

  // --- Populate Form on Edit ---
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setScope(initialData.scope);
      // Handle associatedModel potentially being a full object or just {id}
      const modelId = typeof initialData.associatedModel === 'object' && initialData.associatedModel !== null && 'id' in initialData.associatedModel
                      ? initialData.associatedModel.id
                      : '';
      setAssociatedModelId(modelId);
      // Format messages array as JSON string for textarea
      try {
        setMessagesString(JSON.stringify(initialData.messages || [], null, 2));
        setMessagesError(null);
      } catch (e) {
        setMessagesString('[]');
        setMessagesError('Error formatting initial messages.');
      }
    } else {
      // Reset form for new entry
      setName('');
      setDescription('');
      setScope('private');
      setAssociatedModelId(availableModels.length > 0 ? availableModels[0].id : ''); // Default to first model if available
      setMessagesString('[{\n  "role": "system",\n  "content": "Your system prompt here..."\n},\n{\n  "role": "user",\n  "content": "User message placeholder {{variable}}\"\n}]\'');
      setMessagesError(null);
    }
  }, [initialData, availableModels]);

  // --- Handle Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let messages: PromptTemplateMessage[] = [];

    // Validate Messages JSON
    try {
      messages = JSON.parse(messagesString);
      // Basic validation (check if it's an array)
      if (!Array.isArray(messages)) throw new Error('Messages must be a JSON array.');
      // TODO: Add more robust validation for role/content if needed
      setMessagesError(null);
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'Invalid JSON format for messages.');
      return; // Prevent submission
    }

    if (!name || !associatedModelId || messages.length === 0) {
      alert('Please fill in Name, select an Associated Model, and provide at least one Message.');
      return;
    }

    const formData: TemplateFormData = {
        name,
        description: description || undefined, // Send undefined if empty
        scope,
        associatedModelId,
        messages
    };

    try {
      if (isEditing && initialData) {
        await onUpdate(initialData.id, formData);
      } else {
        await onSubmit(formData);
      }
    } catch (error) {
        // Error handling is likely done in the parent component
        console.error("Form submission error propagated to parent:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
      <h2>{isEditing ? 'Edit Template' : 'Create New Template'}</h2>

      {/* Name Field */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="template-name">Name:</label>
        <input id="template-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} style={{ width: '100%' }} />
      </div>

      {/* Description Field */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="template-description">Description (Optional):</label>
        <input id="template-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} style={{ width: '100%' }} />
      </div>

      {/* Scope Field */}
      <div style={{ marginBottom: '10px' }}>
        <label>Scope:</label>
        <div>
          <label style={{ marginRight: '15px' }}>
            <input type="radio" value="private" checked={scope === 'private'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting} /> Private
          </label>
          <label>
            <input type="radio" value="organization" checked={scope === 'organization'} onChange={(e) => setScope(e.target.value as any)} disabled={isSubmitting} /> Organization
          </label>
        </div>
      </div>

      {/* Associated Model Field */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="template-model">Associated Model:</label>
        <select id="template-model" value={associatedModelId} onChange={(e) => setAssociatedModelId(e.target.value)} required disabled={isSubmitting || availableModels.length === 0} style={{ width: '100%' }}>
           {availableModels.length === 0 && <option value="" disabled>Loading models...</option>}
           {availableModels.map(model => (
            <option key={model.id} value={model.id}>{model.name} ({model.id})</option>
           ))}
        </select>
      </div>

      {/* Messages Field (Textarea for JSON) */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="template-messages">Messages (JSON Array):</label>
        <textarea
          id="template-messages"
          value={messagesString}
          onChange={(e) => setMessagesString(e.target.value)}
          required
          rows={10}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9em', borderColor: messagesError ? 'red' : undefined }}
          disabled={isSubmitting}
        />
        {messagesError && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{messagesError}</p>}
        <small style={{ display: 'block', marginTop: '5px' }}>
          {'Enter messages as a JSON array, e.g., `[{"role": "system", "content": "Your prompt..."}, {"role": "user", "content": "User input..."}]`'}
        </small>
      </div>
      {/* Re-add the div for form actions */}
      <div>
        <button type="submit" disabled={isSubmitting} style={{ marginRight: '10px', padding: '10px 15px' }}>
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Template' : 'Create Template')}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting} style={{ padding: '10px 15px' }}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TemplateForm; 