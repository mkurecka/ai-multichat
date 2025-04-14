import React, { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import {
  PromptTemplate,
  Model,
  getAllPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate
} from '../../services/api';
// import TemplateList from '../templates/TemplateList'; // Remove import
import TemplateForm from '../templates/TemplateForm';
import { Link } from 'react-router-dom';

// Define props expected from App Router
export interface PromptTemplatePageProps { 
  models: Model[]; 
  templates: PromptTemplate[]; 
  setTemplates: Dispatch<SetStateAction<PromptTemplate[]>>; 
}

const PromptTemplatePage: React.FC<PromptTemplatePageProps> = ({ 
  models, 
  templates, // Still needed for TemplateForm initialData potentially?
  setTemplates
}) => {
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await getAllPromptTemplates(); 
      setTemplates(fetchedTemplates); 
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError(err instanceof Error ? err.message : 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (formData: any) => {
    setSubmitting(true);
    setError(null);
    try {
       // Construct the payload for createPromptTemplate based on formData
       // This requires mapping form fields (title, text, scope, modelId, messages) to the API structure
       const templateData = {
            name: formData.title, // Assuming form uses 'title'
            description: formData.description,
            scope: formData.scope,
            associatedModel: { id: formData.associatedModelId },
            messages: formData.messages.map((msg: any) => ({ role: msg.role, content: msg.content }))
            // Make sure all required fields for Omit<...> & { associatedModel: { id: string } } are present
       };
      await createPromptTemplate(templateData as any); // Use type assertion carefully or refine types
      setShowForm(false);
      setEditingTemplate(null);
      await refreshTemplates(); // Refresh list by updating parent state
    } catch (err) {
       console.error("Failed to create template:", err);
       setError(err instanceof Error ? err.message : 'Failed to create template.');
    } finally {
        setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (id: number, formData: any) => {
     setSubmitting(true);
     setError(null);
     try {
       // Construct the partial payload for updatePromptTemplate
       const templateData = {
            name: formData.title,
            description: formData.description,
            scope: formData.scope,
            associatedModel: { id: formData.associatedModelId },
            messages: formData.messages.map((msg: any) => ({ role: msg.role, content: msg.content }))
            // Only include fields that can be updated
       };
       await updatePromptTemplate(id, templateData as any); // Use type assertion carefully or refine types
       setShowForm(false);
       setEditingTemplate(null);
       await refreshTemplates(); // Refresh list by updating parent state
     } catch (err) {
        console.error("Failed to update template:", err);
        setError(err instanceof Error ? err.message : 'Failed to update template.');
     } finally {
         setSubmitting(false);
     }
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
    window.scrollTo(0, 0); // Scroll to top to see form
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setError(null);
      setLoading(true); // Use loading state for delete operation
      try {
        await deletePromptTemplate(id); // Use number ID
        await refreshTemplates(); // Refresh list by updating parent state
      } catch (err) {
          console.error("Failed to delete template:", err);
          setError(err instanceof Error ? err.message : 'Failed to delete template.');
      } finally {
          setLoading(false);
      }
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setError(null); // Clear form-related errors on cancel
  };

  const handleAddNew = () => {
      setEditingTemplate(null);
      setShowForm(true);
      window.scrollTo(0, 0); // Scroll to top
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Prompt Templates Management</h1>
        <div>
           <Link to="/" style={{ marginRight: '10px' }}>Back to Chat</Link>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!showForm && (
        <button onClick={handleAddNew} style={{ marginBottom: '20px', padding: '10px 15px' }}>
          Add New Template
        </button>
      )}

      {showForm && (
        <TemplateForm
          onSubmit={editingTemplate ? (formData) => handleUpdateSubmit(editingTemplate.id, formData) : handleCreateSubmit}
          onCancel={handleCancelForm}
          initialData={editingTemplate}
          isSubmitting={submitting}
          availableModels={models}
        />
      )}

      {!showForm && (
          <div style={{ marginTop: '20px', padding: '20px', border: '1px dashed #ccc', borderRadius: '5px', textAlign: 'center' }}>
              <p>Select a template from the sidebar to view/edit it, or add a new one.</p>
          </div>
      )}
    </div>
  );
};

export default PromptTemplatePage; 