import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TemplateForm, { TemplateFormData } from '../templates/TemplateForm'; // Corrected path
import { getPromptTemplate, updatePromptTemplate, getModels, PromptTemplate, Model } from '../../services/api';
// import LoadingSpinner from '../common/LoadingSpinner'; // Corrected path

const TemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<PromptTemplate | null>(null);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!templateId) {
        setError('No template ID provided.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const numericId = parseInt(templateId, 10);
        if (isNaN(numericId)) {
          throw new Error('Invalid template ID format.');
        }
        // Fetch template and models in parallel
        const [templateData, modelsData] = await Promise.all([
          getPromptTemplate(numericId),
          getModels()
        ]);
        setInitialData(templateData);
        setAvailableModels(modelsData);
      } catch (err) {
        console.error('Failed to fetch template or models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [templateId]);

  const handleSubmit = async (formData: TemplateFormData) => {
     if (!templateId) {
       setError('Cannot submit without a template ID.');
       return;
     }
     const numericId = parseInt(templateId, 10); // Already validated in useEffect

    setIsSubmitting(true);
    setError(null);

    // Prepare data for the API: API expects associatedModel as { id: string }
    const submissionData: Partial<Omit<PromptTemplate, 'id' | 'owner' | 'organization' | 'createdAt' | 'updatedAt'>> & { associatedModel?: { id: string } } = {
      ...formData,
      associatedModel: formData.associatedModelId ? { id: formData.associatedModelId } : undefined,
    };

    try {
      await updatePromptTemplate(numericId, submissionData);
      // Consider adding a success notification/toast here
      navigate('/templates'); // Navigate back to the list page on success
    } catch (err) {
      console.error('Failed to update template:', err);
      // Throw the error so the form's catch block can handle it
       throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/templates'); // Navigate back to wherever the user came from or a default list view
  };

  if (isLoading) {
    // return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    return <div className="p-4">Loading...</div>; // Placeholder text
  }

  if (error && !initialData) { // Show general error only if we couldn't load initial data
    return <div className="p-4 text-red-600 bg-red-100 border border-red-300 rounded">{error}</div>;
  }

  if (!initialData) {
     return <div className="p-4 text-orange-600">Template data not available.</div>;
   }

  return (
    <div className="container mx-auto p-4">
      {/* Renamed EditTemplatePage to TemplateEditor in the component definition */}
      <TemplateForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={initialData}
        isSubmitting={isSubmitting}
        availableModels={availableModels}
      />
    </div>
  );
};

export default TemplateEditor; 