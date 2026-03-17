import { useRef } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ToolMode } from '../../entities/store/uiStore';
import './Toolbar.css';

export function Toolbar() {
  const toolMode = useUIStore((s) => s.toolMode);
  const setToolMode = useUIStore((s) => s.setToolMode);
  const toggleBlockPalette = useUIStore((s) => s.toggleBlockPalette);
  const toggleProperties = useUIStore((s) => s.toggleProperties);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  const showValidation = useUIStore((s) => s.showValidation);
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const toggleWorkspaceManager = useUIStore((s) => s.toggleWorkspaceManager);
  const toggleTemplateGallery = useUIStore((s) => s.toggleTemplateGallery);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const user = useAuthStore((s) => s.user);

  const addPlate = useArchitectureStore((s) => s.addPlate);
  const validate = useArchitectureStore((s) => s.validate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const resetWorkspace = useArchitectureStore((s) => s.resetWorkspace);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const canUndo = useArchitectureStore((s) => s.canUndo);
  const canRedo = useArchitectureStore((s) => s.canRedo);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const importArchitecture = useArchitectureStore((s) => s.importArchitecture);

  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = () => {
    const json = JSON.stringify(architecture, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        importArchitecture(text);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
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
        <span className="toolbar-logo">🧱 CloudBlocks</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-group-label">Plates</span>
        <button type="button" className="toolbar-btn" onClick={handleAddNetwork} title="Add Network (VNet)">
          🌐 Network
        </button>
        <button type="button" className="toolbar-btn toolbar-btn-public" onClick={handleAddPublicSubnet} title="Add Public Subnet">
          🟢 Public Subnet
        </button>
        <button type="button" className="toolbar-btn toolbar-btn-private" onClick={handleAddPrivateSubnet} title="Add Private Subnet">
          🔴 Private Subnet
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-group-label">Tools</span>
        {tools.map((tool) => (
          <button
            type="button"
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
        <span className="toolbar-group-label">Edit</span>
        <button
          type="button"
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪ Redo
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <span className="toolbar-group-label">GitHub</span>
        {isAuthenticated ? (
          <>
            <button type="button" className="toolbar-btn toolbar-btn-github" onClick={toggleGitHubLogin} title="GitHub Account">
              🔐 {user?.github_username ?? 'Account'}
            </button>
            <button type="button" className="toolbar-btn" onClick={toggleGitHubRepos} title="GitHub Repos">
              📦 Repos
            </button>
            <button type="button" className="toolbar-btn" onClick={toggleGitHubSync} title="Sync with GitHub">
              🔄 Sync
            </button>
            <button type="button" className="toolbar-btn" onClick={toggleGitHubPR} title="Create Pull Request">
              🔀 PR
            </button>
          </>
        ) : (
          <button type="button" className="toolbar-btn toolbar-btn-github" onClick={toggleGitHubLogin} title="Sign in with GitHub">
            🔐 Sign In
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" className="toolbar-btn" onClick={handleValidate} title="Validate Architecture">
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
        <button type="button" className="toolbar-btn" onClick={handleSave} title="Save Workspace">
          💾 Save
        </button>
        <button type="button" className="toolbar-btn" onClick={handleLoad} title="Load Workspace">
          📂 Load
        </button>
        <button type="button" className="toolbar-btn" onClick={handleExport} title="Export architecture.json">
          📤 Export
        </button>
        <button type="button" className="toolbar-btn" onClick={handleImport} title="Import architecture.json">
          📥 Import
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        <button type="button" className="toolbar-btn" onClick={handleReset} title="Reset Workspace">
          🔄 Reset
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" className="toolbar-btn" onClick={toggleCodePreview} title="Generate Terraform Code">
          ⚡ Generate
        </button>
        <button type="button" className="toolbar-btn" onClick={toggleWorkspaceManager} title="Manage Workspaces">
          📂 Workspaces
        </button>
        <button type="button" className="toolbar-btn" onClick={toggleTemplateGallery} title="Browse Templates">
          📦 Templates
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" className="toolbar-btn" onClick={toggleBlockPalette}>
          🧱 Palette
        </button>
        <button type="button" className="toolbar-btn" onClick={toggleProperties}>
          📋 Props
        </button>
        <button type="button" className="toolbar-btn" onClick={toggleValidation}>
          📊 Results
        </button>
      </div>
    </div>
  );
}
