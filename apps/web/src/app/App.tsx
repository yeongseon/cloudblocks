import { lazy, Suspense, useEffect } from 'react';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { MenuBar } from '../widgets/menu-bar/MenuBar';

import { ResourceBar } from '../widgets/resource-bar/ResourceBar';


import { ValidationPanel } from '../widgets/validation-panel/ValidationPanel';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useAuthStore } from '../entities/store/authStore';
import { useUIStore } from '../entities/store/uiStore';
import { registerBuiltinTemplates } from '../features/templates/builtin';
import { apiGet } from '../shared/api/client';
import type { AuthResponse } from '../shared/types/api';
import { FlowDiagram } from '../widgets/flow-diagram/FlowDiagram';
import { BottomPanel } from '../widgets/bottom-panel';
import './App.css';

// Lazy-loaded optional widgets (code-split)
const CodePreview = lazy(() => import('../widgets/code-preview/CodePreview').then(m => ({ default: m.CodePreview })));
const WorkspaceManager = lazy(() => import('../widgets/workspace-manager/WorkspaceManager').then(m => ({ default: m.WorkspaceManager })));
const TemplateGallery = lazy(() => import('../widgets/template-gallery/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const GitHubLogin = lazy(() => import('../widgets/github-login/GitHubLogin').then(m => ({ default: m.GitHubLogin })));
const GitHubRepos = lazy(() => import('../widgets/github-repos/GitHubRepos').then(m => ({ default: m.GitHubRepos })));
const GitHubSync = lazy(() => import('../widgets/github-sync/GitHubSync').then(m => ({ default: m.GitHubSync })));
const GitHubPR = lazy(() => import('../widgets/github-pr/GitHubPR').then(m => ({ default: m.GitHubPR })));

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      const savedState = sessionStorage.getItem('github_oauth_state');
      if (state === savedState) {
        sessionStorage.removeItem('github_oauth_state');

        apiGet<AuthResponse>(`/api/v1/auth/github/callback?code=${code}&state=${state}`)
          .then((data) => {
            useAuthStore.getState().login(data.access_token, data.refresh_token, data.user);
            window.history.replaceState({}, '', window.location.pathname);
          })
          .catch((err) => {
            useAuthStore.getState().setError(err instanceof Error ? err.message : 'OAuth failed');
          });
      }
    }
  }, []);

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
      <MenuBar />
      <div className="main-content">
        <div className="canvas-container">
          <ResourceBar />
          <SceneCanvas />
          <ValidationPanel />
          <FlowDiagram />
          <BottomPanel />
          <Suspense fallback={null}>
            <CodePreview />
            <WorkspaceManager />
            <TemplateGallery />
            <GitHubLogin />
            <GitHubRepos />
            <GitHubSync />
            <GitHubPR />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default App;
