import React from 'react';
import { PromptTemplate } from '../../services/api';

interface TemplateListProps {
  templates: PromptTemplate[];
  onEdit: (template: PromptTemplate) => void;
  onDelete: (id: number) => void;
  loading: boolean;
  error: string | null;
}

const TemplateList: React.FC<TemplateListProps> = ({ templates, onEdit, onDelete, loading, error }) => {
  if (loading) return <p>Loading templates...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading templates: {error}</p>;
  if (templates.length === 0) return <p>No prompt templates found.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {templates.map((template) => (
        <li key={template.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px', borderRadius: '5px' }}>
          <h3>{template.name}</h3>
          {template.description && <p><small>{template.description}</small></p>}
          {template.messages && template.messages.length > 0 && (
            <div style={{ marginTop: '5px', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
              <strong>Messages:</strong>
              <ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '5px' }}>
                {template.messages.map((msg, index) => (
                  <li key={index}><strong>{msg.role}:</strong> {msg.content}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => onEdit(template)} style={{ marginRight: '5px' }}>Edit</button>
            <button onClick={() => onDelete(template.id)} style={{ color: 'red' }}>Delete</button>
          </div>
          {template.associatedModel && typeof template.associatedModel === 'object' && 'id' in template.associatedModel && <small>Model: {template.associatedModel.id} </small>}
          {template.createdAt && <small>Created: {new Date(template.createdAt).toLocaleString()}</small>}
        </li>
      ))}
    </ul>
  );
};

export default TemplateList; 