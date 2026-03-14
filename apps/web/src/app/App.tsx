import { useEffect } from 'react';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { Toolbar } from '../widgets/toolbar/Toolbar';
import { BlockPalette } from '../widgets/block-palette/BlockPalette';
import { PropertiesPanel } from '../widgets/properties-panel/PropertiesPanel';
import { ValidationPanel } from '../widgets/validation-panel/ValidationPanel';
import { useArchitectureStore } from '../entities/store/architectureStore';
import './App.css';

function App() {
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);

  // Load saved workspace on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="app">
      <Toolbar />
      <div className="canvas-container">
        <SceneCanvas />
        <BlockPalette />
        <PropertiesPanel />
        <ValidationPanel />
      </div>
    </div>
  );
}

export default App;
