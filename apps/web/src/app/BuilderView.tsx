import { lazy, Suspense, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { ContainerNode, LeafNode } from '@cloudblocks/schema';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { MenuBar } from '../widgets/menu-bar/MenuBar';
import { SidebarPalette } from '../widgets/sidebar-palette';
import { ValidationPanel } from '../widgets/validation-panel/ValidationPanel';
import { FlowDiagram } from '../widgets/flow-diagram/FlowDiagram';
import { BottomPanel } from '../widgets/bottom-panel';
import { LearningPanel } from '../widgets/learning-panel/LearningPanel';
import { OnboardingTour } from '../widgets/onboarding-tour/OnboardingTour';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useAuthStore } from '../entities/store/authStore';
import { useUIStore } from '../entities/store/uiStore';
import { usePromoteStore } from '../entities/store/promoteStore';
import { audioService } from '../shared/utils/audioService';
import { isApiConfigured } from '../shared/api/client';
import './BuilderView.css';
import './LearnMode.css';

const CodePreview = lazy(() =>
  import('../widgets/code-preview/CodePreview').then((m) => ({
    default: m.CodePreview,
  })),
);
const WorkspaceManager = lazy(() =>
  import('../widgets/workspace-manager/WorkspaceManager').then((m) => ({
    default: m.WorkspaceManager,
  })),
);
const TemplateGallery = lazy(() =>
  import('../widgets/template-gallery/TemplateGallery').then((m) => ({
    default: m.TemplateGallery,
  })),
);
const ScenarioGallery = lazy(() =>
  import('../widgets/scenario-gallery/ScenarioGallery').then((m) => ({
    default: m.ScenarioGallery,
  })),
);
const GitHubLogin = lazy(() =>
  import('../widgets/github-login/GitHubLogin').then((m) => ({
    default: m.GitHubLogin,
  })),
);
const GitHubRepos = lazy(() =>
  import('../widgets/github-repos/GitHubRepos').then((m) => ({
    default: m.GitHubRepos,
  })),
);
const GitHubSync = lazy(() =>
  import('../widgets/github-sync/GitHubSync').then((m) => ({
    default: m.GitHubSync,
  })),
);
const GitHubPR = lazy(() =>
  import('../widgets/github-pr/GitHubPR').then((m) => ({
    default: m.GitHubPR,
  })),
);
const DiffPanel = lazy(() =>
  import('../widgets/diff-panel/DiffPanel').then((m) => ({
    default: m.DiffPanel,
  })),
);
const PromoteDialog = lazy(() =>
  import('../widgets/promote-dialog/PromoteDialog').then((m) => ({
    default: m.PromoteDialog,
  })),
);
const RollbackDialog = lazy(() =>
  import('../widgets/rollback-dialog/RollbackDialog').then((m) => ({
    default: m.RollbackDialog,
  })),
);
const PromoteHistory = lazy(() =>
  import('../widgets/promote-history/PromoteHistory').then((m) => ({
    default: m.PromoteHistory,
  })),
);

export function BuilderView() {
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const removeNode = useArchitectureStore((s) => s.removeNode);
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
  const sidebarOpen = useUIStore((s) => s.sidebar.isOpen);
  const inspectorOpen = useUIStore((s) => s.inspector.isOpen);
  const bottomDockOpen = useUIStore((s) => s.bottomDock.isOpen);
  const workspaceId = useArchitectureStore((s) => s.workspace.id);

  const showPromoteDialog = usePromoteStore((s) => s.showPromoteDialog);
  const showRollbackDialog = usePromoteStore((s) => s.showRollbackDialog);
  const showPromoteHistory = usePromoteStore((s) => s.showPromoteHistory);

  useEffect(() => {
    audioService.setMuted(isSoundMuted);
  }, [isSoundMuted]);

  useEffect(() => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

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

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (
        ((e.key === 'z' || e.key === 'Z') &&
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        const arch = useArchitectureStore.getState().workspace.architecture;
        const resources = arch.nodes.filter(
          (node): node is LeafNode => node.kind === 'resource',
        );
        const containers = arch.nodes.filter(
          (node): node is ContainerNode => node.kind === 'container',
        );
        if (resources.find((resource) => resource.id === selectedId)) {
          removeNode(selectedId);
        } else if (containers.find((container) => container.id === selectedId)) {
          removeNode(selectedId);
        } else if (arch.connections.find((c) => c.id === selectedId)) {
          removeConnection(selectedId);
        }
        setSelectedId(null);
        return;
      }

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    saveToStorage,
    selectedId,
    removeNode,
    removeConnection,
    setSelectedId,
    interactionState,
    cancelInteraction,
  ]);

  return (
    <>
      <div
        className="builder-shell"
        data-sidebar-open={sidebarOpen}
        data-inspector-open={inspectorOpen}
        data-bottomdock-open={bottomDockOpen}
      >
        <div className="builder-menubar">
          <MenuBar />
        </div>

        <aside className="builder-sidebar" aria-hidden={!sidebarOpen}>
          <div className="builder-slot">
            <SidebarPalette />
          </div>
        </aside>

        <main className={`builder-canvas${editorMode === 'learn' ? ' learn-mode-active' : ''}`}>
          <div className="builder-slot">
            <SceneCanvas />
            <ValidationPanel />
            <FlowDiagram />
            <LearningPanel />
          </div>
        </main>

        <aside className="builder-inspector" aria-hidden={!inspectorOpen}>
          <div className="builder-slot">
            <Suspense fallback={null}>
              {showCodePreview && <CodePreview key={`code-${workspaceId}`} />}
              {showGitHubLogin && <GitHubLogin />}
              {showGitHubRepos && <GitHubRepos />}
              <GitHubSync />
              {showGitHubPR && <GitHubPR key={`pr-${workspaceId}`} />}
              <DiffPanel />
            </Suspense>
          </div>
        </aside>

        <section className="builder-bottomdock" aria-hidden={!bottomDockOpen}>
          <div className="builder-slot">
            <BottomPanel />
          </div>
        </section>

        <Suspense fallback={null}>
          {showWorkspaceManager && <WorkspaceManager />}
          {showTemplateGallery && <TemplateGallery />}
          {showScenarioGallery && <ScenarioGallery />}
          {showPromoteDialog && <PromoteDialog />}
          {showRollbackDialog && <RollbackDialog />}
          {showPromoteHistory && <PromoteHistory />}
        </Suspense>
      </div>

      <OnboardingTour />
    </>
  );
}
