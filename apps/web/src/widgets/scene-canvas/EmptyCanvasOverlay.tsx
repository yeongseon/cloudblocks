import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import './EmptyCanvasOverlay.css';

export function EmptyCanvasOverlay() {
  const plates = useArchitectureStore((s) => s.workspace.architecture.plates);
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const toggleTemplateGallery = useUIStore((s) => s.toggleTemplateGallery);

  if (plates.length > 0) return null;

  return (
    <div className="empty-canvas-overlay">
      <div className="empty-canvas-content">
        <div className="empty-canvas-icon">🧱</div>
        <h2 className="empty-canvas-title">Build Your Architecture</h2>
        <p className="empty-canvas-subtitle">
          Start designing your cloud infrastructure
        </p>
        <div className="empty-canvas-actions">
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
            onClick={() => addPlate('network', 'VNet', null)}
          >
            ✨ Start from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
