import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import './ResourceBar.css';

export function ResourceBar() {
  const showBlockPalette = useUIStore((s) => s.showBlockPalette);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const containerCount = architecture.nodes.filter((node) => node.kind === 'container').length;
  const resourceCount = architecture.nodes.filter((node) => node.kind === 'resource').length;
  if (!showBlockPalette) return null;

  return (
    <div className="resource-bar">
      <div className="resource-item">
        <span className="resource-icon">🏗️</span>
        <span className="resource-count">{containerCount}</span>
      </div>
      <div className="resource-divider"></div>
      <div className="resource-item">
        <span className="resource-icon">📦</span>
        <span className="resource-count">{resourceCount}</span>
      </div>
      <div className="resource-divider"></div>
      <div className="resource-item">
        <span className="resource-icon">🔗</span>
        <span className="resource-count">{architecture.connections.length}</span>
      </div>
    </div>
  );
}
