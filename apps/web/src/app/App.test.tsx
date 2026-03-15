import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useUIStore } from '../entities/store/uiStore';
import { useAuthStore } from '../entities/store/authStore';

// Mock all child widgets and SceneCanvas
vi.mock('../widgets/scene-canvas/SceneCanvas', () => ({
  SceneCanvas: () => <div data-testid="scene-canvas" />,
}));
vi.mock('../widgets/toolbar/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar" />,
}));
vi.mock('../widgets/block-palette/BlockPalette', () => ({
  BlockPalette: () => <div data-testid="block-palette" />,
}));
vi.mock('../widgets/properties-panel/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel" />,
}));
vi.mock('../widgets/validation-panel/ValidationPanel', () => ({
  ValidationPanel: () => <div data-testid="validation-panel" />,
}));
vi.mock('../widgets/code-preview/CodePreview', () => ({
  CodePreview: () => <div data-testid="code-preview" />,
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
vi.mock('../features/templates/builtin', () => ({
  registerBuiltinTemplates: vi.fn(),
}));
vi.mock('../shared/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiFetch: vi.fn(),
}));

// Import App after mocks
import App from './App';
import { registerBuiltinTemplates } from '../features/templates/builtin';
import { apiGet } from '../shared/api/client';

describe('App', () => {
  const undoMock = vi.fn();
  const redoMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const removeConnectionMock = vi.fn();
  const loadFromStorageMock = vi.fn();
  const setSelectedIdMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
    });
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
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates: [], blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
  });

  it('renders all child components', () => {
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('scene-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('block-palette')).toBeInTheDocument();
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    expect(screen.getByTestId('code-preview')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-manager')).toBeInTheDocument();
    expect(screen.getByTestId('template-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('github-login')).toBeInTheDocument();
    expect(screen.getByTestId('github-repos')).toBeInTheDocument();
    expect(screen.getByTestId('github-sync')).toBeInTheDocument();
    expect(screen.getByTestId('github-pr')).toBeInTheDocument();
  });

  it('calls registerBuiltinTemplates and loadFromStorage on mount', () => {
    render(<App />);
    expect(registerBuiltinTemplates).toHaveBeenCalledOnce();
    expect(loadFromStorageMock).toHaveBeenCalledOnce();
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
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates: [],
          blocks: [{ id: 'block-1', name: 'B', category: 'compute', placementId: 'p1', position: { x: 0, y: 0, z: 0 }, metadata: {} }],
          connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeBlockMock).toHaveBeenCalledWith('block-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Backspace key to remove selected plate', () => {
    useUIStore.setState({ selectedId: 'plate-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      loadFromStorage: loadFromStorageMock,
      undo: undoMock,
      redo: redoMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates: [{ id: 'plate-1', name: 'P', type: 'subnet', parentId: null, children: [], position: { x: 0, y: 0, z: 0 }, size: { width: 5, height: 0.2, depth: 8 }, metadata: {} }],
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(removePlateMock).toHaveBeenCalledWith('plate-1');
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
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates: [], blocks: [],
          connections: [{ id: 'conn-1', sourceId: 's', targetId: 't', type: 'dataflow', metadata: {} }],
          externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('handles Escape key to deselect', () => {
    useUIStore.setState({ selectedId: 'block-1', setSelectedId: setSelectedIdMock });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
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
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates: [], blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
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

  it('handles OAuth callback with code and state params', async () => {
    const apiGetMock = vi.mocked(apiGet);
    const loginMock = vi.fn();
    useAuthStore.setState({ login: loginMock });

    const mockUser = {
      id: 'user-1',
      github_username: 'octocat',
      email: 'octo@example.com',
      display_name: 'The Octocat',
      avatar_url: 'https://example.com/avatar.png',
    };
    apiGetMock.mockResolvedValueOnce({
      access_token: 'at-123',
      refresh_token: 'rt-456',
      token_type: 'bearer',
      user: mockUser,
    });

    sessionStorage.setItem('github_oauth_state', 'state-abc');
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...origLocation, search: '?code=code-xyz&state=state-abc', pathname: '/' },
      writable: true,
      configurable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('at-123', 'rt-456', mockUser);
    });

    // Restore
    Object.defineProperty(window, 'location', {
      value: origLocation,
      writable: true,
      configurable: true,
    });
  });

  it('does not process OAuth when state does not match', () => {
    const apiGetMock = vi.mocked(apiGet);
    sessionStorage.setItem('github_oauth_state', 'different-state');
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...origLocation, search: '?code=code-xyz&state=bad-state', pathname: '/' },
      writable: true,
      configurable: true,
    });

    render(<App />);

    expect(apiGetMock).not.toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, 'location', {
      value: origLocation,
      writable: true,
      configurable: true,
    });
  });

  it('handles OAuth callback error', async () => {
    const apiGetMock = vi.mocked(apiGet);
    const setErrorMock = vi.fn();
    useAuthStore.setState({ setError: setErrorMock });

    apiGetMock.mockRejectedValueOnce(new Error('OAuth failed'));

    sessionStorage.setItem('github_oauth_state', 'state-err');
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...origLocation, search: '?code=bad-code&state=state-err', pathname: '/' },
      writable: true,
      configurable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(setErrorMock).toHaveBeenCalledWith('OAuth failed');
    });

    // Restore
    Object.defineProperty(window, 'location', {
      value: origLocation,
      writable: true,
      configurable: true,
    });
  });
});
