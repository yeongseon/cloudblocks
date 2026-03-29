import { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { MenuBar } from '../widgets/menu-bar/MenuBar';
import { SidebarPalette } from '../widgets/sidebar-palette';
import { OnboardingTour } from '../widgets/onboarding-tour/OnboardingTour';
import { Helper } from '../widgets/helper/Helper';
import { KeyboardShortcuts } from '../widgets/keyboard-shortcuts/KeyboardShortcuts';
import { RightDrawer } from '../widgets/right-drawer';
import { EmptyCanvasCTA } from '../widgets/empty-canvas-cta';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useAuthStore } from '../entities/store/authStore';
import { useUIStore } from '../entities/store/uiStore';
import { usePromoteStore } from '../entities/store/promoteStore';
import { audioService } from '../shared/utils/audioService';
import { isApiConfigured } from '../shared/api/client';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import { MobilePaletteSheet } from '../widgets/mobile-palette-sheet';
import { Plus } from 'lucide-react';
import './BuilderView.css';

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
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
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
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const showWorkspaceManager = useUIStore((s) => s.showWorkspaceManager);
  const showGitHubLogin = useUIStore((s) => s.showGitHubLogin);
  const showGitHubRepos = useUIStore((s) => s.showGitHubRepos);
  const showGitHubPR = useUIStore((s) => s.showGitHubPR);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const sidebarOpen = useUIStore((s) => s.sidebar.isOpen);
  const workspaceId = useArchitectureStore((s) => s.workspace.id);
  const isMobile = useIsMobile();

  const showPromoteDialog = usePromoteStore((s) => s.showPromoteDialog);
  const showRollbackDialog = usePromoteStore((s) => s.showRollbackDialog);
  const showPromoteHistory = usePromoteStore((s) => s.showPromoteHistory);

  // Auto-collapse sidebar on mobile viewport
  useEffect(() => {
    if (isMobile) {
      useUIStore.getState().setSidebarOpen(false);
    }
  }, [isMobile]);
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

  // First-run-only: auto-show scenario drawer once after onboarding
  useEffect(() => {
    const shownKey = 'cloudblocks:scenario-shown-once';
    const onboardingDone = localStorage.getItem('cloudblocks:onboarding-completed');
    if (!localStorage.getItem(shownKey) && onboardingDone) {
      localStorage.setItem(shownKey, 'true');
      useUIStore.getState().openDrawer('scenarios');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '?') {
        setShowKeyboardShortcuts(true);
        return;
      }
      if (e.key === 's' && e.ctrlKey && e.altKey) {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
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
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
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
          (node): node is ResourceBlock => node.kind === 'resource',
        );
        const containers = arch.nodes.filter(
          (node): node is ContainerBlock => node.kind === 'container',
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

      if (e.key === 'Escape' && !showKeyboardShortcuts) {
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
    showKeyboardShortcuts,
  ]);

  return (
    <>
      <div className="builder-shell" data-sidebar-open={sidebarOpen}>
        <div className="builder-menubar">
          <MenuBar />
        </div>

        <aside className="builder-sidebar" aria-hidden={!sidebarOpen}>
          <div className="builder-slot">
            <SidebarPalette />
          </div>
        </aside>

        <main
          className="builder-canvas"
          id="main-content"
          role="application"
          aria-label="Architecture builder canvas"
        >
          <div className="builder-slot">
            <SceneCanvas />
          </div>
          <EmptyCanvasCTA />
          <RightDrawer />
          {isMobile && (
            <button
              type="button"
              className="mobile-fab"
              onClick={() => setMobileSheetOpen(true)}
              aria-label="Add block"
              title="Add block"
            >
              <Plus size={20} />
            </button>
          )}
          {isMobile && (
            <MobilePaletteSheet
              isOpen={mobileSheetOpen}
              onClose={() => setMobileSheetOpen(false)}
            />
          )}
        </main>

        <Suspense fallback={null}>
          {showGitHubLogin && <GitHubLogin />}
          {showGitHubRepos && <GitHubRepos />}
          <GitHubSync />
          {showGitHubPR && <GitHubPR key={`pr-${workspaceId}`} />}
          {showWorkspaceManager && <WorkspaceManager />}
          {showTemplateGallery && <TemplateGallery />}
          {showPromoteDialog && <PromoteDialog />}
          {showRollbackDialog && <RollbackDialog />}
          {showPromoteHistory && <PromoteHistory />}
        </Suspense>

        <KeyboardShortcuts
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      </div>

      <OnboardingTour />
      <Helper />
    </>
  );
}
