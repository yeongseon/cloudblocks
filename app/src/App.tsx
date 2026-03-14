import { useEffect } from 'react';
import { SceneCanvas } from './components/canvas/SceneCanvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { BlockPalette } from './components/panels/BlockPalette';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { ValidationPanel } from './components/panels/ValidationPanel';
import { useArchitectureStore } from './store/architectureStore';
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
