import { useArchitectureStore } from '../../entities/store/architectureStore';
import './ResourceBar.css';

export function ResourceBar() {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  return (
    <div className="resource-bar">
      <div className="resource-item">
        <span className="resource-icon">🏗️</span>
        <span className="resource-count">{architecture.plates.length}</span>
      </div>
      <div className="resource-divider"></div>
      <div className="resource-item">
        <span className="resource-icon">📦</span>
        <span className="resource-count">{architecture.blocks.length}</span>
      </div>
      <div className="resource-divider"></div>
      <div className="resource-item">
        <span className="resource-icon">🔗</span>
        <span className="resource-count">{architecture.connections.length}</span>
      </div>
    </div>
  );
}
