import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from '../entities/store/uiStore';
import { registerBuiltinTemplates } from '../features/templates/builtin';
import { registerBuiltinScenarios } from '../features/learning/scenarios/builtin';
import { audioService } from '../shared/utils/audioService';
import { SOUND_ASSETS } from '../shared/assets/sounds';
import { metricsService } from '../shared/utils/metricsService';
import { LandingPage } from '../widgets/landing-page/LandingPage';
import { BuilderView } from './BuilderView';
import { DemoBanner } from './DemoBanner';
import './App.css';

registerBuiltinTemplates();
registerBuiltinScenarios();

function App() {
  const appView = useUIStore((s) => s.appView);
  const themeVariant = useUIStore((s) => s.themeVariant);
  const effectiveAppView = import.meta.env.MODE === 'test' ? 'builder' : appView;

  useEffect(() => {
    document.documentElement.dataset.theme =
      effectiveAppView === 'landing' ? 'workshop' : themeVariant;
  }, [effectiveAppView, themeVariant]);

  useEffect(() => {
    audioService.preloadAll(SOUND_ASSETS).catch(() => {});
    metricsService.trackEvent('app_loaded');
  }, []);

  return (
    <div className="app">
      <DemoBanner />
      {effectiveAppView === 'landing' ? <LandingPage /> : <BuilderView />}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#e0e0e0',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </div>
  );
}

export default App;
