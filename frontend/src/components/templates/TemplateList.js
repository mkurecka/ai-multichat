import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TemplateList = ({ templates, onEdit, onDelete, loading, error }) => {
    if (loading)
        return _jsx("p", { children: "Loading templates..." });
    if (error)
        return _jsxs("p", { style: { color: 'red' }, children: ["Error loading templates: ", error] });
    if (templates.length === 0)
        return _jsx("p", { children: "No prompt templates found." });
    return (_jsx("ul", { style: { listStyle: 'none', padding: 0 }, children: templates.map((template) => (_jsxs("li", { style: { border: '1px solid #ccc', marginBottom: '10px', padding: '10px', borderRadius: '5px' }, children: [_jsx("h3", { children: template.name }), template.description && _jsx("p", { children: _jsx("small", { children: template.description }) }), _jsx("p", { style: { whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: '5px' }, children: template.text }), _jsxs("div", { style: { marginTop: '10px' }, children: [_jsx("button", { onClick: () => onEdit(template), style: { marginRight: '5px' }, children: "Edit" }), _jsx("button", { onClick: () => onDelete(template.id), style: { color: 'red' }, children: "Delete" })] }), template.associatedModel && typeof template.associatedModel === 'object' && 'id' in template.associatedModel && _jsxs("small", { children: ["Model: ", template.associatedModel.id, " "] }), template.createdAt && _jsxs("small", { children: ["Created: ", new Date(template.createdAt).toLocaleString()] })] }, template.id))) }));
};
export default TemplateList;
