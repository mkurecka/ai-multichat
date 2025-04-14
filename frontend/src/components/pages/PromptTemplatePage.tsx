import React, { useState, useEffect, useCallback } from 'react';
import {
  PromptTemplate,
  Model,
  getAllPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate
} from '../../services/api';
import TemplateList from '../templates/TemplateList';
import TemplateForm from '../templates/TemplateForm';
import { Link } from 'react-router-dom'; // For navigating back

// Define props expected from App Router
interface PromptTemplatePageProps {
  models: Model[]; // Expect models prop
}

const PromptTemplatePage: React.FC<PromptTemplatePageProps> = ({ models }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await getAllPromptTemplates(); // Use correct function
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError(err instanceof Error ? err.message : 'Failed to load templates.');
      // Handle potential 401 unauthorized error if necessary
      // if (axios.isAxiosError(err) && err.response?.status === 401) {
      //   handleLogout(); // Or redirect to login
      // }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateSubmit = async (formData: any /* Replace any with a specific form data interface */) => {
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
      await loadTemplates(); // Refresh list
    } catch (err) {
       console.error("Failed to create template:", err);
       setError(err instanceof Error ? err.message : 'Failed to create template.');
    } finally {
        setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (id: number, formData: any /* Replace any */) => {
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
       await loadTemplates(); // Refresh list
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

  const handleDelete = async (id: number /* ID is now number */) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setError(null);
      try {
        await deletePromptTemplate(id); // Use number ID
        await loadTemplates();
      } catch (err) {
          console.error("Failed to delete template:", err);
          setError(err instanceof Error ? err.message : 'Failed to delete template.');
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
        <h1>Prompt Templates</h1>
        <div>
           <Link to="/" style={{ marginRight: '10px' }}>Back to Chat</Link>
           {/* <button onClick={handleLogout}>Logout</button> */}
        </div>
      </div>

      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>Error: {error}</p>}

      {!showForm && (
        <button onClick={handleAddNew} style={{ marginBottom: '20px', padding: '10px 15px' }}>
          Add New Template
        </button>
      )}

      {showForm && (
        <TemplateForm
          onSubmit={handleCreateSubmit}
          onUpdate={handleUpdateSubmit}
          onCancel={handleCancelForm}
          initialData={editingTemplate}
          isSubmitting={submitting}
          availableModels={models}
        />
      )}

      <TemplateList
        templates={templates}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        error={null} // Page-level error is handled above
      />
    </div>
  );
};

export default PromptTemplatePage; 