import { useRef } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { clearWorkspaceDiffUI } from '../../entities/store/uiSync';
import { toast } from 'react-hot-toast';
import './EmptyCanvasOverlay.css';

export function EmptyCanvasOverlay() {
  const activeProvider = useUIStore((s) => s.activeProvider);
  const containerCount = useArchitectureStore(
    (s) => s.workspace.architecture.nodes.filter((node) => node.kind === 'container').length,
  );
  const drawer = useUIStore((s) => s.drawer);
  const openDrawer = useUIStore((s) => s.openDrawer);
  const addNode = useArchitectureStore((s) => s.addNode);
  const importArchitecture = useArchitectureStore((s) => s.importArchitecture);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (containerCount > 0 || (drawer.isOpen && drawer.activePanel === 'templates')) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        const error = importArchitecture(text, activeProvider);
        if (error) {
          toast.error(`Import failed: ${error}`);
        } else {
          clearWorkspaceDiffUI();
          toast.success('Architecture imported successfully!');
        }
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="empty-canvas-overlay">
      <div className="empty-canvas-content">
        <h1 className="empty-canvas-title">CloudBlocks</h1>
        <p className="empty-canvas-subtitle">Visual cloud architecture builder</p>
        <div className="empty-canvas-grid">
          <button
            type="button"
            className="empty-canvas-card empty-canvas-card--primary"
            onClick={() =>
              addNode({
                kind: 'container',
                resourceType: 'virtual_network',
                name: 'VNet',
                parentId: null,
                layer: 'region',
              })
            }
          >
            <span className="empty-canvas-card-icon">+</span>
            <span className="empty-canvas-card-label">Create Workspace</span>
            <span className="empty-canvas-card-desc">Start with a blank canvas</span>
          </button>
          <button
            type="button"
            className="empty-canvas-card"
            onClick={() => openDrawer('templates')}
          >
            <span className="empty-canvas-card-icon">&#9776;</span>
            <span className="empty-canvas-card-label">Explore Templates</span>
            <span className="empty-canvas-card-desc">Browse architecture patterns</span>
          </button>
          <button type="button" className="empty-canvas-card" onClick={handleImportClick}>
            <span className="empty-canvas-card-icon">&#8593;</span>
            <span className="empty-canvas-card-label">Import JSON</span>
            <span className="empty-canvas-card-desc">Load an exported architecture</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="empty-canvas-file-input"
          onChange={handleImportFile}
          data-testid="import-file-input"
        />
      </div>
    </div>
  );
}
