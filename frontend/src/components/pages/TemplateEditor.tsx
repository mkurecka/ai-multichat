import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PromptTemplate, getPromptTemplate, Model } from '../../services/api'; // Import necessary types and API function

// Assuming TemplateForm props might be needed later
import TemplateForm from '../templates/TemplateForm';

const TemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for available models (needed if we reuse TemplateForm later)
  const [availableModels, setAvailableModels] = useState<Model[]>([]); 
  
  // TODO: Fetch available models if TemplateForm is used for editing

  useEffect(() => {
    if (!templateId) {
      setError('No template ID provided.');
      setLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      setLoading(true);
      setError(null);
      try {
        // Convert string ID from URL param to number for the API call
        const numericTemplateId = parseInt(templateId, 10);
        if (isNaN(numericTemplateId)) {
           throw new Error ('Invalid template ID format.');
        }
        const fetchedTemplate = await getPromptTemplate(numericTemplateId);
        setTemplate(fetchedTemplate);
      } catch (err) {
        console.error("Failed to fetch template:", err);
        setError(err instanceof Error ? err.message : 'Failed to load template.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
    // Dependency array includes templateId to refetch if the ID changes
  }, [templateId]); 

  // --- Rendering Logic ---
  if (loading) {
    return <div className="p-4">Loading template details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!template) {
    return <div className="p-4">Template not found.</div>;
  }

  // TODO: Later, replace this display logic with the TemplateForm for editing
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Template Details: {template.name}</h2>
        <Link to="/templates" className="text-blue-600 hover:underline">Back to Templates Overview</Link>
      </div>
      
      <div className="space-y-4">
        <div><strong>ID:</strong> {template.id}</div>
        <div><strong>Name:</strong> {template.name}</div>
        {template.description && <div><strong>Description:</strong> {template.description}</div>}
        <div><strong>Scope:</strong> {template.scope}</div>
        <div>
          <strong>Associated Model:</strong> 
          {typeof template.associatedModel === 'object' && template.associatedModel !== null && 'id' in template.associatedModel 
            ? `${template.associatedModel.id}` // Display model ID 
            : 'N/A'}
          {/* Ideally, fetch model name based on ID for better display */}
        </div>
        
        {/* Display Messages */} 
        {template.messages && template.messages.length > 0 && (
            <div className="mt-2 p-3 border rounded bg-gray-50">
              <strong className="block mb-2">Messages:</strong>
              <ul className="list-disc list-inside space-y-1">
                {template.messages.map((msg, index) => (
                  <li key={index}>
                    <strong className="capitalize">{msg.role}:</strong> 
                    <pre className="inline whitespace-pre-wrap text-sm ml-1">{msg.content}</pre>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
        {template.createdAt && <div><strong>Created At:</strong> {new Date(template.createdAt).toLocaleString()}</div>}
        {template.updatedAt && <div><strong>Updated At:</strong> {new Date(template.updatedAt).toLocaleString()}</div>}

        {/* Placeholder for Edit Button/Form Integration */} 
        <div className="mt-6">
           <button 
             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
             onClick={() => alert('Edit functionality to be implemented using TemplateForm.')}
           >
             Edit Template (WIP)
           </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor; 