import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { listTemplates, listTemplatesByCategory } from '../../features/templates/registry';
import type { ArchitectureTemplate, TemplateCategory, TemplateDifficulty } from '../../shared/types/template';
import './TemplateGallery.css';

const difficultyColors: Record<TemplateDifficulty, string> = {
  beginner: '#81C784',
  intermediate: '#FFB74D',
  advanced: '#E57373',
};

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
  const show = useUIStore((s) => s.showTemplateGallery);
  const toggleTemplateGallery = useUIStore((s) => s.toggleTemplateGallery);
  const loadFromTemplate = useArchitectureStore((s) => s.loadFromTemplate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');

  if (!show) return null;

  const templates =
    activeCategory === 'all'
      ? listTemplates()
      : listTemplatesByCategory(activeCategory);

  const handleUseTemplate = (template: ArchitectureTemplate) => {
    loadFromTemplate(template);
    saveToStorage();
    toggleTemplateGallery();
  };

  return (
    <div className="template-gallery">
      <div className="template-gallery-header">
        <h3 className="template-gallery-title">📦 Templates</h3>
        <button className="template-gallery-close" onClick={toggleTemplateGallery}>
          ✕
        </button>
      </div>

      <div className="template-gallery-filters">
        {categoryKeys.map((key) => (
          <button
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
                  className="template-gallery-badge"
                  style={{ color: difficultyColors[template.difficulty] }}
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
                  {template.generatorCompat && (
                    <span className="template-gallery-tag template-gallery-tag-compat">
                      {template.generatorCompat.join(' · ')}
                    </span>
                  )}
                </div>
                <button
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
