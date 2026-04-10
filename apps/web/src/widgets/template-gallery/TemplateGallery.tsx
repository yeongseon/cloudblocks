import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { syncWorkspaceUI } from '../../entities/store/uiSync';
import { listTemplates, listTemplatesByCategory } from '../../features/templates/registry';
import type { ArchitectureTemplate, TemplateCategory } from '../../shared/types/template';
import './TemplateGallery.css';

const categoryLabels: Record<TemplateCategory | 'all', string> = {
  all: 'All',
  'web-application': 'Web App',
  serverless: 'Serverless',
  'data-pipeline': 'Data Pipeline',
  general: 'General',
};

const categoryKeys: Array<TemplateCategory | 'all'> = [
  'all',
  'web-application',
  'serverless',
  'data-pipeline',
  'general',
];

export function TemplateGallery() {
  const activeProvider = useUIStore((s) => s.activeProvider);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const loadFromTemplate = useArchitectureStore((s) => s.loadFromTemplate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');

  const templates =
    activeCategory === 'all' ? listTemplates() : listTemplatesByCategory(activeCategory);

  const handleUseTemplate = (template: ArchitectureTemplate) => {
    loadFromTemplate(template, activeProvider);
    syncWorkspaceUI({ fitToContent: true });
    saveToStorage();
    setActiveCategory('all');
    closeDrawer();
  };

  return (
    <div className="template-gallery">
      <div className="template-gallery-filters">
        {categoryKeys.map((key) => (
          <button
            type="button"
            key={key}
            className={`template-gallery-filter-btn${activeCategory === key ? ' active' : ''}`}
            onClick={() => setActiveCategory(key)}
          >
            {categoryLabels[key]}
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <div className="template-gallery-empty">No templates in this category.</div>
      ) : (
        <div className="template-gallery-list">
          {templates.map((template) => (
            <div key={template.id} className="template-gallery-card">
              <div className="template-gallery-card-header">
                <span className="template-gallery-card-name">{template.name}</span>
                <span
                  className={`template-gallery-badge template-gallery-badge--${template.difficulty}`}
                >
                  {template.difficulty}
                </span>
              </div>
              <p className="template-gallery-card-desc">{template.description}</p>
              <div className="template-gallery-card-footer">
                <div className="template-gallery-tags">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="template-gallery-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="template-gallery-use-btn"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
