import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { getTemplate } from '../../features/templates/registry';
import './EmptyCanvasOverlay.css';

const DEMO_TEMPLATE_ID = 'template-three-tier';

export function EmptyCanvasOverlay() {
  const containerCount = useArchitectureStore((s) => s.workspace.architecture.nodes.filter((node) => node.kind === 'container').length);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const addNode = useArchitectureStore((s) => s.addNode);
  const loadFromTemplate = useArchitectureStore((s) => s.loadFromTemplate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const toggleTemplateGallery = useUIStore((s) => s.toggleTemplateGallery);
  const toggleScenarioGallery = useUIStore((s) => s.toggleScenarioGallery);

  if (containerCount > 0 || showTemplateGallery) return null;

  const handleLoadDemo = () => {
    const template = getTemplate(DEMO_TEMPLATE_ID);
    if (template) {
      loadFromTemplate(template);
      saveToStorage();
    }
  };

  return (
    <div className="empty-canvas-overlay">
      <div className="empty-canvas-content">
        <div className="empty-canvas-icon">🧱</div>
        <h2 className="empty-canvas-title">Design Cloud Architecture Visually</h2>
        <p className="empty-canvas-subtitle">
          Place resources, connect services, and generate Terraform or Bicep in one click
        </p>
        <div className="empty-canvas-grid">
          <button
            type="button"
            className="empty-canvas-btn empty-canvas-btn--template"
            onClick={() => toggleTemplateGallery()}
          >
            📋 Use Template
          </button>
          <button
            type="button"
            className="empty-canvas-btn empty-canvas-btn--scratch"
            onClick={() => addNode({ kind: 'container', resourceType: 'virtual_network', name: 'VNet', parentId: null, layer: 'region' })}
          >
            ✨ Start from Scratch
          </button>
          <button
            type="button"
            className="empty-canvas-btn empty-canvas-btn--learn"
            onClick={() => toggleScenarioGallery()}
          >
            📖 Learn How
          </button>
          <button
            type="button"
            className="empty-canvas-btn empty-canvas-btn--demo"
            onClick={handleLoadDemo}
          >
            🚀 Try Demo
          </button>
        </div>
      </div>
    </div>
  );
}
