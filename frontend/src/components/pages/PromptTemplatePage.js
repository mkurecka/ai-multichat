import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { getAllPromptTemplates, createPromptTemplate, updatePromptTemplate, deletePromptTemplate } from '../../services/api';
import TemplateList from '../templates/TemplateList';
import TemplateForm from '../templates/TemplateForm';
import { Link } from 'react-router-dom'; // For navigating back
const PromptTemplatePage = ({ models }) => {
    const [templates, setTemplates] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedTemplates = await getAllPromptTemplates(); // Use correct function
            setTemplates(fetchedTemplates);
        }
        catch (err) {
            console.error("Failed to fetch templates:", err);
            setError(err instanceof Error ? err.message : 'Failed to load templates.');
            // Handle potential 401 unauthorized error if necessary
            // if (axios.isAxiosError(err) && err.response?.status === 401) {
            //   handleLogout(); // Or redirect to login
            // }
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);
    const handleCreateSubmit = async (formData /* Replace any with a specific form data interface */) => {
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
                messages: formData.messages.map((msg) => ({ role: msg.role, content: msg.content }))
                // Make sure all required fields for Omit<...> & { associatedModel: { id: string } } are present
            };
            await createPromptTemplate(templateData); // Use type assertion carefully or refine types
            setShowForm(false);
            setEditingTemplate(null);
            await loadTemplates(); // Refresh list
        }
        catch (err) {
            console.error("Failed to create template:", err);
            setError(err instanceof Error ? err.message : 'Failed to create template.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleUpdateSubmit = async (id, formData /* Replace any */) => {
        setSubmitting(true);
        setError(null);
        try {
            // Construct the partial payload for updatePromptTemplate
            const templateData = {
                name: formData.title,
                description: formData.description,
                scope: formData.scope,
                associatedModel: { id: formData.associatedModelId },
                messages: formData.messages.map((msg) => ({ role: msg.role, content: msg.content }))
                // Only include fields that can be updated
            };
            await updatePromptTemplate(id, templateData); // Use type assertion carefully or refine types
            setShowForm(false);
            setEditingTemplate(null);
            await loadTemplates(); // Refresh list
        }
        catch (err) {
            console.error("Failed to update template:", err);
            setError(err instanceof Error ? err.message : 'Failed to update template.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleEdit = (template) => {
        setEditingTemplate(template);
        setShowForm(true);
        window.scrollTo(0, 0); // Scroll to top to see form
    };
    const handleDelete = async (id /* ID is now number */) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            setError(null);
            try {
                await deletePromptTemplate(id); // Use number ID
                await loadTemplates();
            }
            catch (err) {
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
    return (_jsxs("div", { style: { padding: '20px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }, children: [_jsx("h1", { children: "Prompt Templates" }), _jsx("div", { children: _jsx(Link, { to: "/", style: { marginRight: '10px' }, children: "Back to Chat" }) })] }), error && _jsxs("p", { style: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }, children: ["Error: ", error] }), !showForm && (_jsx("button", { onClick: handleAddNew, style: { marginBottom: '20px', padding: '10px 15px' }, children: "Add New Template" })), showForm && (_jsx(TemplateForm, { onSubmit: handleCreateSubmit, onUpdate: handleUpdateSubmit, onCancel: handleCancelForm, initialData: editingTemplate, isSubmitting: submitting, availableModels: models })), _jsx(TemplateList, { templates: templates, onEdit: handleEdit, onDelete: handleDelete, loading: loading, error: null })] }));
};
export default PromptTemplatePage;
