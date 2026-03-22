import { lazy, Suspense, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { MenuBar } from '../widgets/menu-bar/MenuBar';

import { ResourceBar } from '../widgets/resource-bar/ResourceBar';


import { ValidationPanel } from '../widgets/validation-panel/ValidationPanel';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useAuthStore } from '../entities/store/authStore';
import { useUIStore } from '../entities/store/uiStore';


import { usePromoteStore } from '../entities/store/promoteStore';
import { registerBuiltinTemplates } from '../features/templates/builtin';
import { FlowDiagram } from '../widgets/flow-diagram/FlowDiagram';
import { BottomPanel } from '../widgets/bottom-panel';
import { LearningPanel } from '../widgets/learning-panel/LearningPanel';
import { registerBuiltinScenarios } from '../features/learning/scenarios/builtin';
import { audioService } from '../shared/utils/audioService';
import { SOUND_ASSETS } from '../shared/assets/sounds';
import { isApiConfigured } from '../shared/api/client';
import type { ContainerNode, LeafNode } from '@cloudblocks/schema';
import './App.css';
import './LearnMode.css';

// Lazy-loaded optional widgets (code-split)
const CodePreview = lazy(() => import('../widgets/code-preview/CodePreview').then(m => ({ default: m.CodePreview })));
const WorkspaceManager = lazy(() => import('../widgets/workspace-manager/WorkspaceManager').then(m => ({ default: m.WorkspaceManager })));
const TemplateGallery = lazy(() => import('../widgets/template-gallery/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const ScenarioGallery = lazy(() => import('../widgets/scenario-gallery/ScenarioGallery').then(m => ({ default: m.ScenarioGallery })));
const GitHubLogin = lazy(() => import('../widgets/github-login/GitHubLogin').then(m => ({ default: m.GitHubLogin })));
const GitHubRepos = lazy(() => import('../widgets/github-repos/GitHubRepos').then(m => ({ default: m.GitHubRepos })));
const GitHubSync = lazy(() => import('../widgets/github-sync/GitHubSync').then(m => ({ default: m.GitHubSync })));
const GitHubPR = lazy(() => import('../widgets/github-pr/GitHubPR').then(m => ({ default: m.GitHubPR })));
const DiffPanel = lazy(() => import('../widgets/diff-panel/DiffPanel').then(m => ({ default: m.DiffPanel })));


const PromoteDialog = lazy(() => import('../widgets/promote-dialog/PromoteDialog').then(m => ({ default: m.PromoteDialog })));
const RollbackDialog = lazy(() => import('../widgets/rollback-dialog/RollbackDialog').then(m => ({ default: m.RollbackDialog })));
const PromoteHistory = lazy(() => import('../widgets/promote-history/PromoteHistory').then(m => ({ default: m.PromoteHistory })));

function App() {
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const interactionState = useUIStore((s) => s.interactionState);
  const cancelInteraction = useUIStore((s) => s.cancelInteraction);
  const editorMode = useUIStore((s) => s.editorMode);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const showCodePreview = useUIStore((s) => s.showCodePreview);
  const showWorkspaceManager = useUIStore((s) => s.showWorkspaceManager);
  const showGitHubLogin = useUIStore((s) => s.showGitHubLogin);
  const showGitHubRepos = useUIStore((s) => s.showGitHubRepos);
  const showGitHubPR = useUIStore((s) => s.showGitHubPR);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const showScenarioGallery = useUIStore((s) => s.showScenarioGallery);

  const persona = useUIStore((s) => s.persona);

  const workspaceId = useArchitectureStore((s) => s.workspace.id);

  const showPromoteDialog = usePromoteStore((s) => s.showPromoteDialog);
  const showRollbackDialog = usePromoteStore((s) => s.showRollbackDialog);
  const showPromoteHistory = usePromoteStore((s) => s.showPromoteHistory);

  // Determine right-panel CSS class so canvas viewport shrinks accordingly
  const isWideRightPanel = showPromoteHistory;
  const isNarrowRightPanel =
    showCodePreview ||
    showGitHubLogin ||
    showGitHubRepos ||
    showGitHubPR ||
    showPromoteDialog ||
    showRollbackDialog;
  const rightPanelClass = isWideRightPanel
    ? ' right-panel-wide'
    : isNarrowRightPanel
      ? ' right-panel-open'
      : '';

  useEffect(() => {
    audioService.preloadAll(SOUND_ASSETS).catch(() => {});
  }, []);

  useEffect(() => {
    audioService.setMuted(isSoundMuted);
  }, [isSoundMuted]);

  // Load saved workspace and register templates on mount
  useEffect(() => {
    registerBuiltinTemplates();
    registerBuiltinScenarios();
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isApiConfigured()) {
      useUIStore.getState().setBackendStatus('not_configured');
    }

    void (async () => {
      await useAuthStore.getState().checkSession();

      if (useAuthStore.getState().status !== 'authenticated') {
        return;
      }

      const uiState = useUIStore.getState();
      const pendingAction = uiState.pendingGitHubAction;

      if (pendingAction === 'sync' && !uiState.showGitHubSync) {
        uiState.toggleGitHubSync();
      } else if (pendingAction === 'pr' && !uiState.showGitHubPR) {
        uiState.toggleGitHubPR();
      } else if (pendingAction === 'repos' && !uiState.showGitHubRepos) {
        uiState.toggleGitHubRepos();
      }

      if (pendingAction !== null) {
        uiState.setPendingGitHubAction(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (persona === 'student') {
      useUIStore.getState().setShowScenarioGallery(true);
      useUIStore.getState().setEditorMode('learn');
    }
  }, [persona]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const success = saveToStorage();
        if (success) {
          toast.success('Workspace saved!');
        } else {
          toast.error('Failed to save workspace. Storage may be full.');
        }
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
        const resources = arch.nodes.filter((node): node is LeafNode => node.kind === 'resource');
        const containers = arch.nodes.filter((node): node is ContainerNode => node.kind === 'container');
        if (resources.find((resource) => resource.id === selectedId)) {
          removeBlock(selectedId);
        } else if (containers.find((container) => container.id === selectedId)) {
          removePlate(selectedId);
        } else if (arch.connections.find((c) => c.id === selectedId)) {
          removeConnection(selectedId);
        }
        setSelectedId(null);
        return;
      }

      // Escape: cancel drag first, then deselect, then exit diff mode
      if (e.key === 'Escape') {
        if (interactionState === 'placing') {
          cancelInteraction();
          return;
        }
        const { diffMode, setDiffMode } = useUIStore.getState();
        if (diffMode) {
          setDiffMode(false);
          return;
        }
        setSelectedId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveToStorage, selectedId, removeBlock, removePlate, removeConnection, setSelectedId, interactionState, cancelInteraction]);

  return (
    <div className="app">
      <MenuBar />
      <div className="main-content">
        <div className={`canvas-container${editorMode === 'learn' ? ' learn-mode-active' : ''}${rightPanelClass}`}>
          <ResourceBar />
          <SceneCanvas />
          <ValidationPanel />
          <FlowDiagram />
          <BottomPanel />
          <LearningPanel />
          <Suspense fallback={null}>
            {showCodePreview && <CodePreview key={`code-${workspaceId}`} />}
            {showWorkspaceManager && <WorkspaceManager />}
            {showTemplateGallery && <TemplateGallery />}
            {showGitHubLogin && <GitHubLogin />}
            {showGitHubRepos && <GitHubRepos />}
            <GitHubSync />
            {showGitHubPR && <GitHubPR key={`pr-${workspaceId}`} />}
            <DiffPanel />
            {showScenarioGallery && <ScenarioGallery />}
            {showPromoteDialog && <PromoteDialog />}
            {showRollbackDialog && <RollbackDialog />}
            {showPromoteHistory && <PromoteHistory />}
          </Suspense>
        </div>
      </div>
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
