import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useUIStore } from '../entities/store/uiStore';
import { useAuthStore } from '../entities/store/authStore';
import { endpointId } from '@cloudblocks/schema';
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  toast: toastMock,
  Toaster: () => <div data-testid="app-toaster" />,
}));

// Mock all child widgets and SceneCanvas
vi.mock('../widgets/scene-canvas/SceneCanvas', () => ({
  SceneCanvas: () => <div data-testid="scene-canvas" />,
}));
vi.mock('../widgets/menu-bar/MenuBar', () => ({
  MenuBar: () => <div data-testid="menu-bar" />,
}));
vi.mock('../widgets/sidebar-palette', () => ({
  SidebarPalette: () => <div data-testid="sidebar-palette" />,
}));
vi.mock('../widgets/right-drawer', () => ({
  RightDrawer: () => <div data-testid="right-drawer" />,
}));
vi.mock('../widgets/workspace-manager/WorkspaceManager', () => ({
  WorkspaceManager: () => <div data-testid="workspace-manager" />,
}));
vi.mock('../widgets/template-gallery/TemplateGallery', () => ({
  TemplateGallery: () => <div data-testid="template-gallery" />,
}));
vi.mock('../widgets/github-login/GitHubLogin', () => ({
  GitHubLogin: () => <div data-testid="github-login" />,
}));
vi.mock('../widgets/github-repos/GitHubRepos', () => ({
  GitHubRepos: () => <div data-testid="github-repos" />,
}));
vi.mock('../widgets/github-sync/GitHubSync', () => ({
  GitHubSync: () => <div data-testid="github-sync" />,
}));
vi.mock('../widgets/github-pr/GitHubPR', () => ({
  GitHubPR: () => <div data-testid="github-pr" />,
}));

vi.mock('../widgets/promote-dialog/PromoteDialog', () => ({
  PromoteDialog: () => <div data-testid="promote-dialog" />,
}));
vi.mock('../widgets/rollback-dialog/RollbackDialog', () => ({
  RollbackDialog: () => <div data-testid="rollback-dialog" />,
}));
vi.mock('../widgets/promote-history/PromoteHistory', () => ({
  PromoteHistory: () => <div data-testid="promote-history" />,
}));
vi.mock('../widgets/onboarding-tour/OnboardingTour', () => ({
  OnboardingTour: () => <div data-testid="onboarding-tour" />,
}));
vi.mock('../features/templates/builtin', () => ({
  registerBuiltinTemplates: vi.fn(),
}));

// Import App after mocks
import App from './App';
import { registerBuiltinTemplates } from '../features/templates/builtin';

const defaultCancelDrag = useUIStore.getState().cancelDrag;
const defaultSetDiffMode = useUIStore.getState().setDiffMode;

describe('App', () => {
  const undoMock = vi.fn();
  const redoMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const removeConnectionMock = vi.fn();
  const loadFromStorageMock = vi.fn();
  const saveToStorageMock = vi.fn();
  const setSelectedIdMock = vi.fn();
  const checkSessionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
      cancelDrag: defaultCancelDrag,
      setDiffMode: defaultSetDiffMode,
      draggedBlockCategory: null,
      diffMode: false,
      showCodePreview: true,
      showWorkspaceManager: true,
      showGitHubLogin: true,
      showGitHubRepos: true,
      showGitHubPR: true,
      showTemplateGallery: true,
      showScenarioGallery: true,
    });
    useAuthStore.setState({
      status: 'unknown',
      user: null,
      hydrated: false,
      error: null,
      checkSession: checkSessionMock,
    });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      saveToStorage: saveToStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders all child components', async () => {
    render(<App />);
    expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
    expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-palette')).toBeInTheDocument();
    expect(screen.getByTestId('right-drawer')).toBeInTheDocument();
    // Lazy-loaded widgets (code-split) — need to wait for async load
    expect(await screen.findByTestId('workspace-manager')).toBeInTheDocument();
    expect(await screen.findByTestId('template-gallery')).toBeInTheDocument();
    expect(await screen.findByTestId('github-login')).toBeInTheDocument();
    expect(await screen.findByTestId('github-repos')).toBeInTheDocument();
    expect(await screen.findByTestId('github-sync')).toBeInTheDocument();
    expect(await screen.findByTestId('github-pr')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByTestId('app-toaster')).toBeInTheDocument();
  });

  it('calls loadFromStorage on mount (template registration occurs at module init)', () => {
    render(<App />);
    expect(registerBuiltinTemplates).not.toHaveBeenCalled();
    expect(loadFromStorageMock).toHaveBeenCalledOnce();
  });

  it('calls checkSession on mount', () => {
    render(<App />);
    expect(checkSessionMock).toHaveBeenCalledOnce();
  });

  it('restores pending GitHub action after authenticated session check', async () => {
    useUIStore.setState({
      showGitHubSync: false,
      showGitHubPR: false,
      showGitHubRepos: false,
      pendingGitHubAction: 'repos',
    });
    checkSessionMock.mockImplementation(async () => {
      useAuthStore.setState({ status: 'authenticated' });
    });

    render(<App />);

    await waitFor(() => {
      expect(useUIStore.getState().showGitHubRepos).toBe(true);
    });
    expect(useUIStore.getState().pendingGitHubAction).toBe(null);
  });

  it('handles Ctrl+S for save with success toast', () => {
    saveToStorageMock.mockReturnValue(true);
    render(<App />);
    const preventDefaultMock = vi.fn();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true, preventDefault: preventDefaultMock });
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toastMock.success).toHaveBeenCalledWith('Workspace saved!');
  });

  it('handles Meta+S for save (macOS) with success toast', () => {
    saveToStorageMock.mockReturnValue(true);
    render(<App />);
    const preventDefaultMock = vi.fn();
    fireEvent.keyDown(window, { key: 's', metaKey: true, preventDefault: preventDefaultMock });
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toastMock.success).toHaveBeenCalledWith('Workspace saved!');
  });

  it('handles Ctrl+S for save with failure toast', () => {
    saveToStorageMock.mockReturnValue(false);
    render(<App />);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toastMock.error).toHaveBeenCalledWith('Failed to save workspace. Storage may be full.');
  });

  it('handles Ctrl+Z for undo', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undoMock).toHaveBeenCalledOnce();
  });

  it('handles Meta+Z for undo (macOS)', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(undoMock).toHaveBeenCalledOnce();
  });

  it('handles Ctrl+Shift+Z for redo', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(redoMock).toHaveBeenCalledOnce();
  });

  it('handles Ctrl+Shift+Z with uppercase Z for redo', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(redoMock).toHaveBeenCalledOnce();
  });

  it('handles Ctrl+Y for redo', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(redoMock).toHaveBeenCalledOnce();
  });

  it('handles Delete key to remove selected block', () => {
    useUIStore.setState({ selectedId: 'block-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [
            {
              id: 'block-1',
              name: 'B',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'azure',
              parentId: 'p1',
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeBlockMock).toHaveBeenCalledWith('block-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Backspace key to remove selected container', () => {
    useUIStore.setState({ selectedId: 'container-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [
            {
              id: 'container-1',
              name: 'P',
              kind: 'container',
              layer: 'subnet',
              resourceType: 'subnet',
              category: 'network',
              provider: 'azure',
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              frame: { width: 5, height: 0.2, depth: 8 },
              metadata: {},
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(removePlateMock).toHaveBeenCalledWith('container-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Delete key to remove selected connection', () => {
    useUIStore.setState({ selectedId: 'conn-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [],
          connections: [
            {
              id: 'conn-1',
              from: endpointId('s', 'output', 'data'),
              to: endpointId('t', 'input', 'data'),
              metadata: {},
            },
          ],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Backspace key to remove selected connection', () => {
    useUIStore.setState({ selectedId: 'conn-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [],
          connections: [
            {
              id: 'conn-1',
              from: endpointId('s', 'output', 'data'),
              to: endpointId('t', 'input', 'data'),
              metadata: {},
            },
          ],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Escape key to deselect', () => {
    useUIStore.setState({ selectedId: 'block-1', setSelectedId: setSelectedIdMock });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Escape key to cancel interaction before deselecting', () => {
    const cancelInteractionMock = vi.fn();
    useUIStore.setState({
      interactionState: 'placing',
      cancelInteraction: cancelInteractionMock,
      selectedId: 'block-1',
      setSelectedId: setSelectedIdMock,
    });

    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(cancelInteractionMock).toHaveBeenCalledOnce();
    expect(setSelectedIdMock).not.toHaveBeenCalled();
  });

  it('handles Escape key to exit diff mode before deselecting', () => {
    const setDiffModeMock = vi.fn();
    useUIStore.setState({
      interactionState: 'idle',
      diffMode: true,
      setDiffMode: setDiffModeMock,
      draggedBlockCategory: null,
      selectedId: 'block-1',
      setSelectedId: setSelectedIdMock,
    });

    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(setDiffModeMock).toHaveBeenCalledWith(false);
    expect(setSelectedIdMock).not.toHaveBeenCalled();
  });

  it('does not intercept keyboard shortcuts when typing in input', () => {
    render(<App />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(undoMock).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('does not intercept keyboard shortcuts when typing in textarea', () => {
    render(<App />);
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
    expect(undoMock).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('does not remove when Delete pressed but no element matches selectedId', () => {
    useUIStore.setState({ selectedId: 'nonexistent', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeBlockMock).not.toHaveBeenCalled();
    expect(removePlateMock).not.toHaveBeenCalled();
    expect(removeConnectionMock).not.toHaveBeenCalled();
    // setSelectedId is still called with null even when no entity found
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('does not delete when Delete pressed but nothing is selected', () => {
    useUIStore.setState({ selectedId: null, setSelectedId: setSelectedIdMock });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeBlockMock).not.toHaveBeenCalled();
    expect(removePlateMock).not.toHaveBeenCalled();
    expect(removeConnectionMock).not.toHaveBeenCalled();
  });

  it('cleans up keyboard event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<App />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('renders ops widgets when their show flags are true', async () => {
    const { usePromoteStore } = await import('../entities/store/promoteStore');

    usePromoteStore.setState({
      showPromoteDialog: true,
      showRollbackDialog: true,
      showPromoteHistory: true,
    });

    render(<App />);

    expect(await screen.findByTestId('promote-dialog')).toBeInTheDocument();
    expect(await screen.findByTestId('rollback-dialog')).toBeInTheDocument();
    expect(await screen.findByTestId('promote-history')).toBeInTheDocument();
  });
});
