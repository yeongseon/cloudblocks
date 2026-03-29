import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuilderView } from './BuilderView';
import { useUIStore } from '../entities/store/uiStore';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useAuthStore } from '../entities/store/authStore';

// Mock CSS
vi.mock('./BuilderView.css', () => ({}));

// Mock heavy dependencies
vi.mock('../widgets/scene-canvas/SceneCanvas', () => ({
  SceneCanvas: () => <div data-testid="scene-canvas" />,
}));

vi.mock('../widgets/menu-bar/MenuBar', () => ({
  MenuBar: () => <div data-testid="menu-bar" />,
}));

vi.mock('../widgets/sidebar-palette', () => ({
  SidebarPalette: () => <div data-testid="sidebar-palette" />,
}));

vi.mock('../widgets/onboarding-tour/OnboardingTour', () => ({
  OnboardingTour: () => null,
}));

vi.mock('../widgets/helper/Helper', () => ({
  Helper: () => null,
}));

vi.mock('../widgets/keyboard-shortcuts/KeyboardShortcuts', () => ({
  KeyboardShortcuts: () => null,
}));

vi.mock('../widgets/right-drawer', () => ({
  RightDrawer: () => null,
}));

vi.mock('../widgets/empty-canvas-cta', () => ({
  EmptyCanvasCTA: () => null,
}));

vi.mock('../widgets/mobile-palette-sheet', () => ({
  MobilePaletteSheet: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="mobile-palette-sheet">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock useIsMobile
vi.mock('../shared/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock audio service
vi.mock('../shared/utils/audioService', () => ({
  audioService: { setMuted: vi.fn() },
}));

// Mock isApiConfigured
vi.mock('../shared/api/client', () => ({
  isApiConfigured: vi.fn(() => false),
}));

const { useIsMobile } = await import('../shared/hooks/useIsMobile');

describe('BuilderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      interactionState: 'idle',
      isSoundMuted: true,
      showWorkspaceManager: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubPR: false,

      sidebar: { isOpen: true },
      pendingGitHubAction: null,
      diffMode: false,
    });

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          id: 'arch-1',
          name: 'Test Architecture',
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

    useAuthStore.setState({
      status: 'unknown',
      user: null,
      error: null,
    });
  });

  describe('mobile layout', () => {
    it('renders mobile FAB when viewport is mobile', async () => {
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<BuilderView />);

      const fab = screen.getByRole('button', { name: 'Add block' });
      expect(fab).toBeInTheDocument();
      expect(fab).toHaveClass('mobile-fab');
    });

    it('does not render mobile FAB on desktop', async () => {
      vi.mocked(useIsMobile).mockReturnValue(false);

      render(<BuilderView />);

      const fab = screen.queryByRole('button', { name: 'Add block' });
      expect(fab).not.toBeInTheDocument();
    });

    it('opens MobilePaletteSheet when FAB is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<BuilderView />);

      // Palette sheet should not be visible initially
      expect(screen.queryByTestId('mobile-palette-sheet')).not.toBeInTheDocument();

      // Click FAB
      const fab = screen.getByRole('button', { name: 'Add block' });
      await user.click(fab);

      // Sheet should now be visible
      expect(screen.getByTestId('mobile-palette-sheet')).toBeInTheDocument();
    });

    it('closes MobilePaletteSheet when close button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<BuilderView />);

      // Click FAB to open sheet
      const fab = screen.getByRole('button', { name: 'Add block' });
      await user.click(fab);

      expect(screen.getByTestId('mobile-palette-sheet')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);

      // Sheet should be hidden
      expect(screen.queryByTestId('mobile-palette-sheet')).not.toBeInTheDocument();
    });

    it('auto-collapses sidebar on mobile viewport', async () => {
      vi.mocked(useIsMobile).mockReturnValue(true);

      // Pre-set sidebar to open
      useUIStore.setState({
        sidebar: { isOpen: true },
      });

      render(<BuilderView />);

      // Wait for useEffect to run and collapse sidebar
      await waitFor(() => {
        expect(useUIStore.getState().sidebar.isOpen).toBe(false);
      });
    });

    it('keeps sidebar state unchanged on desktop', async () => {
      vi.mocked(useIsMobile).mockReturnValue(false);

      useUIStore.setState({
        sidebar: { isOpen: true },
      });

      render(<BuilderView />);

      // Sidebar should remain open on desktop
      await waitFor(() => {
        expect(useUIStore.getState().sidebar.isOpen).toBe(true);
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('renders the component without errors', () => {
      render(<BuilderView />);

      expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-palette')).toBeInTheDocument();
    });

    it('loads from storage on mount', async () => {
      const loadFromStorageSpy = vi.spyOn(useArchitectureStore.getState(), 'loadFromStorage');

      render(<BuilderView />);

      await waitFor(() => {
        expect(loadFromStorageSpy).toHaveBeenCalled();
      });

      loadFromStorageSpy.mockRestore();
    });

    it('handles ? key to show keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<BuilderView />);

      // Initially, KeyboardShortcuts should be closed (we mocked it)
      await user.keyboard('?');

      // The component should handle the key event without error
      expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
    });

    it('handles Ctrl+S to save workspace', async () => {
      const user = userEvent.setup();
      const saveToStorageSpy = vi.spyOn(useArchitectureStore.getState(), 'saveToStorage');

      render(<BuilderView />);

      // Trigger Ctrl+S
      await user.keyboard('{Control>}s{/Control}');

      // The save should be attempted
      await waitFor(() => {
        expect(saveToStorageSpy).toHaveBeenCalled();
      });

      saveToStorageSpy.mockRestore();
    });

    it('handles Ctrl+Z to undo', async () => {
      const user = userEvent.setup();
      const undoSpy = vi.spyOn(useArchitectureStore.getState(), 'undo');

      render(<BuilderView />);

      // Trigger Ctrl+Z
      await user.keyboard('{Control>}z{/Control}');

      await waitFor(() => {
        expect(undoSpy).toHaveBeenCalled();
      });

      undoSpy.mockRestore();
    });

    it('handles Ctrl+Shift+Z to redo', async () => {
      const user = userEvent.setup();
      const redoSpy = vi.spyOn(useArchitectureStore.getState(), 'redo');

      render(<BuilderView />);

      // Trigger Ctrl+Shift+Z
      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

      await waitFor(() => {
        expect(redoSpy).toHaveBeenCalled();
      });

      redoSpy.mockRestore();
    });

    it('handles Delete key to remove selected node', async () => {
      const user = userEvent.setup();
      const removeNodeSpy = vi.spyOn(useArchitectureStore.getState(), 'removeNode');
      const removeConnectionSpy = vi.spyOn(useArchitectureStore.getState(), 'removeConnection');

      // Set a selected ID
      useUIStore.setState({
        selectedId: 'node-1',
      });

      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            id: 'arch-1',
            name: 'Test Architecture',
            version: '1.0.0',
            nodes: [
              {
                id: 'node-1',
                name: 'Test Node',
                kind: 'resource',
                resourceType: 'virtual_machine',
                category: 'compute',
                provider: 'azure',
                layer: 'subnet',
                parentId: 'subnet-1',
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

      render(<BuilderView />);

      // Trigger Delete key
      await user.keyboard('{Delete}');

      await waitFor(() => {
        expect(removeNodeSpy).toHaveBeenCalledWith('node-1');
      });

      removeNodeSpy.mockRestore();
      removeConnectionSpy.mockRestore();
    });

    it('handles Escape key to deselect', async () => {
      const user = userEvent.setup();

      useUIStore.setState({
        selectedId: 'node-1',
      });

      render(<BuilderView />);

      // Trigger Escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(useUIStore.getState().selectedId).toBeNull();
      });
    });

    it('handles Ctrl+Alt+S to toggle sidebar', async () => {
      const user = userEvent.setup();
      const toggleSidebarSpy = vi.spyOn(useUIStore.getState(), 'toggleSidebar');

      useUIStore.setState({
        sidebar: { isOpen: true },
      });

      render(<BuilderView />);

      // Trigger Ctrl+Alt+S
      await user.keyboard('{Control>}{Alt>}s{/Alt}{/Control}');

      await waitFor(() => {
        expect(toggleSidebarSpy).toHaveBeenCalled();
      });

      toggleSidebarSpy.mockRestore();
    });
  });
});
