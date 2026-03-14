import { useEffect } from 'react';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { Toolbar } from '../widgets/toolbar/Toolbar';
import { BlockPalette } from '../widgets/block-palette/BlockPalette';
import { PropertiesPanel } from '../widgets/properties-panel/PropertiesPanel';
import { ValidationPanel } from '../widgets/validation-panel/ValidationPanel';
import { CodePreview } from '../widgets/code-preview/CodePreview';
import { WorkspaceManager } from '../widgets/workspace-manager/WorkspaceManager';
import { TemplateGallery } from '../widgets/template-gallery/TemplateGallery';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useUIStore } from '../entities/store/uiStore';
import { registerBuiltinTemplates } from '../features/templates/builtin';
import './App.css';

function App() {
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  // Load saved workspace and register templates on mount
  useEffect(() => {
    registerBuiltinTemplates();
    loadFromStorage();
  }, [loadFromStorage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z (no shift)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        const arch = useArchitectureStore.getState().workspace.architecture;
        if (arch.blocks.find((b) => b.id === selectedId)) {
          removeBlock(selectedId);
        } else if (arch.plates.find((p) => p.id === selectedId)) {
          removePlate(selectedId);
        } else if (arch.connections.find((c) => c.id === selectedId)) {
          removeConnection(selectedId);
        }
        setSelectedId(null);
        return;
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedId, removeBlock, removePlate, removeConnection, setSelectedId]);

  return (
    <div className="app">
      <Toolbar />
      <div className="canvas-container">
        <SceneCanvas />
        <BlockPalette />
        <PropertiesPanel />
        <ValidationPanel />
        <CodePreview />
        <WorkspaceManager />
        <TemplateGallery />
      </div>
    </div>
  );
}

export default App;
