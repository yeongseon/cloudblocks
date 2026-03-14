import { useArchitectureStore } from '../../store/architectureStore';
import { useUIStore } from '../../store/uiStore';
import type { ToolMode } from '../../store/uiStore';
import './Toolbar.css';

export function Toolbar() {
  const toolMode = useUIStore((s) => s.toolMode);
  const setToolMode = useUIStore((s) => s.setToolMode);
  const toggleBlockPalette = useUIStore((s) => s.toggleBlockPalette);
  const toggleProperties = useUIStore((s) => s.toggleProperties);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  const showValidation = useUIStore((s) => s.showValidation);

  const addPlate = useArchitectureStore((s) => s.addPlate);
  const validate = useArchitectureStore((s) => s.validate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const resetWorkspace = useArchitectureStore((s) => s.resetWorkspace);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const handleAddNetwork = () => {
    addPlate('network', 'VNet', null);
  };

  const handleAddPublicSubnet = () => {
    const network = architecture.plates.find((p) => p.type === 'network');
    if (!network) {
      alert('Please create a Network Plate first.');
      return;
    }
    addPlate('subnet', 'Public Subnet', network.id, 'public');
  };

  const handleAddPrivateSubnet = () => {
    const network = architecture.plates.find((p) => p.type === 'network');
    if (!network) {
      alert('Please create a Network Plate first.');
      return;
    }
    addPlate('subnet', 'Private Subnet', network.id, 'private');
  };

  const handleValidate = () => {
    const result = validate();
    if (!showValidation) toggleValidation();
    if (result.valid) {
      // Visual feedback
    }
  };

  const handleSave = () => {
    saveToStorage();
    alert('Workspace saved!');
  };

  const handleLoad = () => {
    loadFromStorage();
  };

  const handleReset = () => {
    if (confirm('Reset workspace? All unsaved changes will be lost.')) {
      resetWorkspace();
    }
  };

  const tools: { mode: ToolMode; icon: string; label: string }[] = [
    { mode: 'select', icon: '👆', label: 'Select' },
    { mode: 'connect', icon: '🔗', label: 'Connect' },
    { mode: 'delete', icon: '❌', label: 'Delete' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-logo">🧱 Cloud Lego</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-group-label">Plates</span>
        <button className="toolbar-btn" onClick={handleAddNetwork} title="Add Network (VNet)">
          🌐 Network
        </button>
        <button className="toolbar-btn toolbar-btn-public" onClick={handleAddPublicSubnet} title="Add Public Subnet">
          🟢 Public
        </button>
        <button className="toolbar-btn toolbar-btn-private" onClick={handleAddPrivateSubnet} title="Add Private Subnet">
          🔴 Private
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-group-label">Tools</span>
        {tools.map((tool) => (
          <button
            key={tool.mode}
            className={`toolbar-btn ${toolMode === tool.mode ? 'toolbar-btn-active' : ''}`}
            onClick={() => setToolMode(tool.mode)}
            title={tool.label}
          >
            {tool.icon} {tool.label}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleValidate} title="Validate Architecture">
          ✅ Validate
        </button>
        {validationResult && (
          <span
            className={`toolbar-badge ${validationResult.valid ? 'toolbar-badge-valid' : 'toolbar-badge-invalid'}`}
          >
            {validationResult.valid
              ? '✓ Valid'
              : `${validationResult.errors.length} errors`}
          </span>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleSave} title="Save Workspace">
          💾 Save
        </button>
        <button className="toolbar-btn" onClick={handleLoad} title="Load Workspace">
          📂 Load
        </button>
        <button className="toolbar-btn" onClick={handleReset} title="Reset Workspace">
          🔄 Reset
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={toggleBlockPalette}>
          🧱 Palette
        </button>
        <button className="toolbar-btn" onClick={toggleProperties}>
          📋 Props
        </button>
        <button className="toolbar-btn" onClick={toggleValidation}>
          📊 Results
        </button>
      </div>
    </div>
  );
}
