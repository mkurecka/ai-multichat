import React from 'react';
import { PromptTemplate } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// Define props for the component
interface TemplateListSidebarProps {
  templates: PromptTemplate[];
  loading: boolean; // Accept loading state from parent
  error: string | null; // Accept error state from parent
  // activeTemplateId?: number | null; // Add this later for highlighting
}

const TemplateListSidebar: React.FC<TemplateListSidebarProps> = ({ 
  templates, 
  loading, 
  error 
}) => {
  const navigate = useNavigate(); // Hook for navigation

  const handleSelectTemplate = (templateId: number) => {
    navigate(`/templates/${templateId}`);
  };

  return (
    <div className="sidebar">
      <h3 className="text-lg font-semibold mb-1 border-b pb-1 px-2">Templates</h3>
      <div className="chat-history-list">
        {loading && <p className="no-history-message px-2 py-1">Loading Templates...</p>}
        {error && <p className="no-history-message text-red-500 px-2 py-1">Error: {error}</p>}
        {!loading && !error && templates.length === 0 && (
          <p className="no-history-message px-2 py-1">No templates found.</p>
        )}
        {!loading && !error && templates.length > 0 && (
          templates.map((template) => (
            <div
              key={template.id}
              className="chat-history-item"
              title={template.name}
              onClick={() => handleSelectTemplate(template.id)}
              style={{ cursor: 'pointer' }}
            >
              {template.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateListSidebar; 