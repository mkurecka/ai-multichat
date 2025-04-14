import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const TemplateForm = ({ onSubmit, onUpdate, onCancel, initialData, isSubmitting, availableModels }) => {
    // --- State for Form Fields ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('private');
    const [associatedModelId, setAssociatedModelId] = useState('');
    // Simple approach for messages: JSON string in textarea
    const [messagesString, setMessagesString] = useState('[]');
    const [messagesError, setMessagesError] = useState(null);
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
            }
            catch (e) {
                setMessagesString('[]');
                setMessagesError('Error formatting initial messages.');
            }
        }
        else {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        let messages = [];
        // Validate Messages JSON
        try {
            messages = JSON.parse(messagesString);
            // Basic validation (check if it's an array)
            if (!Array.isArray(messages))
                throw new Error('Messages must be a JSON array.');
            // TODO: Add more robust validation for role/content if needed
            setMessagesError(null);
        }
        catch (error) {
            setMessagesError(error instanceof Error ? error.message : 'Invalid JSON format for messages.');
            return; // Prevent submission
        }
        if (!name || !associatedModelId || messages.length === 0) {
            alert('Please fill in Name, select an Associated Model, and provide at least one Message.');
            return;
        }
        const formData = {
            name,
            description: description || undefined, // Send undefined if empty
            scope,
            associatedModelId,
            messages
        };
        try {
            if (isEditing && initialData) {
                await onUpdate(initialData.id, formData);
            }
            else {
                await onSubmit(formData);
            }
        }
        catch (error) {
            // Error handling is likely done in the parent component
            console.error("Form submission error propagated to parent:", error);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, style: { border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '5px' }, children: [_jsx("h2", { children: isEditing ? 'Edit Template' : 'Create New Template' }), _jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("label", { htmlFor: "template-name", children: "Name:" }), _jsx("input", { id: "template-name", type: "text", value: name, onChange: (e) => setName(e.target.value), required: true, disabled: isSubmitting, style: { width: '100%' } })] }), _jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("label", { htmlFor: "template-description", children: "Description (Optional):" }), _jsx("input", { id: "template-description", type: "text", value: description, onChange: (e) => setDescription(e.target.value), disabled: isSubmitting, style: { width: '100%' } })] }), _jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("label", { children: "Scope:" }), _jsxs("div", { children: [_jsxs("label", { style: { marginRight: '15px' }, children: [_jsx("input", { type: "radio", value: "private", checked: scope === 'private', onChange: (e) => setScope(e.target.value), disabled: isSubmitting }), " Private"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", value: "organization", checked: scope === 'organization', onChange: (e) => setScope(e.target.value), disabled: isSubmitting }), " Organization"] })] })] }), _jsxs("div", { style: { marginBottom: '10px' }, children: [_jsx("label", { htmlFor: "template-model", children: "Associated Model:" }), _jsxs("select", { id: "template-model", value: associatedModelId, onChange: (e) => setAssociatedModelId(e.target.value), required: true, disabled: isSubmitting || availableModels.length === 0, style: { width: '100%' }, children: [availableModels.length === 0 && _jsx("option", { value: "", disabled: true, children: "Loading models..." }), availableModels.map(model => (_jsxs("option", { value: model.id, children: [model.name, " (", model.id, ")"] }, model.id)))] })] }), _jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("label", { htmlFor: "template-messages", children: "Messages (JSON Array):" }), _jsx("textarea", { id: "template-messages", value: messagesString, onChange: (e) => setMessagesString(e.target.value), required: true, rows: 10, style: { width: '100%', fontFamily: 'monospace', fontSize: '0.9em', borderColor: messagesError ? 'red' : undefined }, disabled: isSubmitting }), messagesError && _jsx("p", { style: { color: 'red', fontSize: '0.8em', marginTop: '5px' }, children: messagesError }), _jsx("small", { style: { display: 'block', marginTop: '5px' }, children: 'Enter messages as a JSON array, e.g., `[{"role": "system", "content": "Your prompt..."}, {"role": "user", "content": "User input..."}]`' })] }), _jsxs("div", { children: [_jsx("button", { type: "submit", disabled: isSubmitting, style: { marginRight: '10px', padding: '10px 15px' }, children: isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Template' : 'Create Template') }), _jsx("button", { type: "button", onClick: onCancel, disabled: isSubmitting, style: { padding: '10px 15px' }, children: "Cancel" })] })] }));
};
export default TemplateForm;
