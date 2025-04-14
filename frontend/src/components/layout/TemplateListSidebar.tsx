import React, { useState, useEffect, useCallback } from 'react';
import { PromptTemplate, getAllPromptTemplates } from '../../services/api';
import { Link } from 'react-router-dom';

const TemplateListSidebar: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await getAllPromptTemplates();
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error("Failed to fetch templates for sidebar:", err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-3 border-b pb-2">Templates</h3>
      {loading && <p className="text-xs text-gray-500">Loading...</p>}
      {error && <p className="text-xs text-red-500">Error: {error}</p>}
      {!loading && !error && templates.length === 0 && (
        <p className="text-xs text-gray-500">No templates found.</p>
      )}
      {!loading && !error && templates.length > 0 && (
        <ul className="flex-1 overflow-y-auto space-y-1 list-none p-0 m-0">
          {templates.map((template) => (
            <li key={template.id}>
              {/* Optional: Link to edit the template? Needs more logic */}
              {/* For now, just display the name */}
              <span 
                className="block p-2 text-sm rounded hover:bg-gray-100 truncate"
                title={template.name}
              >
                {template.name}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Maybe add a button here later to trigger creating a new template */} 
      {/* <button className="mt-auto">New Template</button> */}
    </div>
  );
};

export default TemplateListSidebar; 