import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { getAllPromptTemplates } from '../../services/api';
const TemplateListSidebar = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedTemplates = await getAllPromptTemplates();
            setTemplates(fetchedTemplates);
        }
        catch (err) {
            console.error("Failed to fetch templates for sidebar:", err);
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);
    return (_jsxs("div", { className: "p-4 flex flex-col h-full", children: [_jsx("h3", { className: "text-lg font-semibold mb-3 border-b pb-2", children: "Templates" }), loading && _jsx("p", { className: "text-xs text-gray-500", children: "Loading..." }), error && _jsxs("p", { className: "text-xs text-red-500", children: ["Error: ", error] }), !loading && !error && templates.length === 0 && (_jsx("p", { className: "text-xs text-gray-500", children: "No templates found." })), !loading && !error && templates.length > 0 && (_jsx("ul", { className: "flex-1 overflow-y-auto space-y-1 list-none p-0 m-0", children: templates.map((template) => (_jsx("li", { children: _jsx("span", { className: "block p-2 text-sm rounded hover:bg-gray-100 truncate", title: template.name, children: template.name }) }, template.id))) }))] }));
};
export default TemplateListSidebar;
