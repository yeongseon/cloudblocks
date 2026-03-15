import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ToolMode } from '../../entities/store/uiStore';
import './StatusBar.css';

const TOOL_ICONS: Record<ToolMode, string> = {
  select: '👆 Select',
  connect: '🔗 Connect',
  delete: '❌ Delete'
};

const TOOL_HINTS: Record<ToolMode, string> = {
  select: 'Click an element to select it',
  connect: 'Click source block, then target block',
  delete: 'Click an element to remove it'
};

export function StatusBar() {
  const toolMode = useUIStore((s) => s.toolMode);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  
  const workspaceName = useArchitectureStore((s) => s.workspace.name);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const errorCount = validationResult?.errors?.length ?? 0;
  
  let chipStatus = 'neutral';
  let chipText = '⏳ Not validated';
  
  if (validationResult) {
    if (errorCount === 0) {
      chipStatus = 'valid';
      chipText = '✓ Valid';
    } else {
      chipStatus = 'invalid';
      chipText = `✕ ${errorCount} error${errorCount !== 1 ? 's' : ''}`;
    }
  }

  return (
    <div className="status-bar">
      <div className="status-section left-section">
        <div className="tool-mode">
          {TOOL_ICONS[toolMode]}
        </div>
        <div className="tool-hint">
          {TOOL_HINTS[toolMode]}
        </div>
      </div>

      <div className="status-section center-section">
        <div className="workspace-name">{workspaceName}</div>
      </div>

      <div className="status-section right-section">
        <div className="element-counts">
          <span>🏗️ {architecture.plates.length} plates</span>
          <span className="dot-divider">·</span>
          <span>📦 {architecture.blocks.length} blocks</span>
          <span className="dot-divider">·</span>
          <span>🔗 {architecture.connections.length} connections</span>
        </div>
        
        <button 
          type="button"
          className={`validation-chip ${chipStatus}`}
          onClick={toggleValidation}
        >
          {chipText}
        </button>
      </div>
    </div>
  );
}
