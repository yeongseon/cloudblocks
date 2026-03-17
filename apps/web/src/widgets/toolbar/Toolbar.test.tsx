import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Plate } from '../../shared/types/index';

const emptyArch: ArchitectureModel = {
  id: 'arch-1', name: 'Test', version: '1.0.0',
  plates: [], blocks: [], connections: [], externalActors: [],
  createdAt: '', updatedAt: '',
};

const networkPlate: Plate = {
  id: 'net-1', name: 'VNet', type: 'network', parentId: null,
  children: [], position: { x: 0, y: 0, z: 0 },
  size: { width: 12, height: 0.3, depth: 10 }, metadata: {},
};

describe('Toolbar', () => {
  const addPlateMock = vi.fn();
  const validateMock = vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] });
  const saveToStorageMock = vi.fn();
  const loadFromStorageMock = vi.fn();
  const resetWorkspaceMock = vi.fn();
  const undoMock = vi.fn();
  const redoMock = vi.fn();
  const importArchitectureMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      toolMode: 'select',
      showValidation: false,
      showBlockPalette: true,
      showProperties: true,
      showCodePreview: false,
      showWorkspaceManager: false,
      showTemplateGallery: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
    });
    useAuthStore.setState({ status: 'anonymous', user: null, hydrated: true, error: null });
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
  });

  it('renders toolbar with logo', () => {
    render(<Toolbar />);
    expect(screen.getByText(/CloudBlocks/)).toBeInTheDocument();
  });

  it('renders all plate buttons', () => {
    render(<Toolbar />);
    expect(screen.getByText(/Network/)).toBeInTheDocument();
    expect(screen.getByText(/Public/)).toBeInTheDocument();
    expect(screen.getByText(/Private/)).toBeInTheDocument();
  });

  it('renders tool mode buttons', () => {
    render(<Toolbar />);
    expect(screen.getByText(/Select/)).toBeInTheDocument();
    expect(screen.getByText(/Connect/)).toBeInTheDocument();
    expect(screen.getByText(/Delete/)).toBeInTheDocument();
  });

  it('shows Sign In button when not authenticated', () => {
    render(<Toolbar />);
    expect(screen.getByTitle('Sign in with GitHub')).toBeInTheDocument();
  });

  it('shows GitHub username when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: 'The Octocat',
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    expect(screen.getByText('🔐 octocat')).toBeInTheDocument();
  });

  it('shows Repos, Sync, PR buttons when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: 'The Octocat',
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    expect(screen.getByTitle('GitHub Repos')).toBeInTheDocument();
    expect(screen.getByTitle('Sync with GitHub')).toBeInTheDocument();
    expect(screen.getByTitle('Create Pull Request')).toBeInTheDocument();
  });

  // --- Plate actions ---

  it('adds network plate on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Add Network (VNet)'));
    expect(addPlateMock).toHaveBeenCalledWith('network', 'VNet', null);
  });

  it('adds public subnet when network exists', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...emptyArch, plates: [networkPlate] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Add Public Subnet'));
    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Public Subnet', 'net-1', 'public');
  });

  it('alerts when adding public subnet without network', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Toolbar />);
    await user.click(screen.getByTitle('Add Public Subnet'));
    expect(alertMock).toHaveBeenCalledWith('Please create a Network Plate first.');
    expect(addPlateMock).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('adds private subnet when network exists', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...emptyArch, plates: [networkPlate] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Add Private Subnet'));
    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Private Subnet', 'net-1', 'private');
  });

  it('alerts when adding private subnet without network', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Toolbar />);
    await user.click(screen.getByTitle('Add Private Subnet'));
    expect(alertMock).toHaveBeenCalledWith('Please create a Network Plate first.');
    alertMock.mockRestore();
  });

  // --- Tool modes ---

  it('sets tool mode to connect on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Connect'));
    expect(useUIStore.getState().toolMode).toBe('connect');
  });

  it('sets tool mode to delete on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Delete'));
    expect(useUIStore.getState().toolMode).toBe('delete');
  });

  it('sets tool mode to select on click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ toolMode: 'connect' });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Select'));
    expect(useUIStore.getState().toolMode).toBe('select');
  });

  it('applies active class to current tool mode button', () => {
    useUIStore.setState({ toolMode: 'connect' });
    render(<Toolbar />);
    const connectBtn = screen.getByTitle('Connect');
    expect(connectBtn.className).toContain('toolbar-btn-active');
  });

  // --- Validate ---

  it('validates architecture on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Validate Architecture'));
    expect(validateMock).toHaveBeenCalled();
  });

  it('opens validation panel when validating if not open', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showValidation: false });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Validate Architecture'));
    expect(useUIStore.getState().showValidation).toBe(true);
  });

  it('shows validation badge when validationResult exists', () => {
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: { valid: true, errors: [], warnings: [] },
      workspace: {
        id: 'ws-1', name: 'Test', architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    expect(screen.getByText('✓ Valid')).toBeInTheDocument();
  });

  it('shows error count in badge when invalid', () => {
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: {
        valid: false,
        errors: [
          { ruleId: 'r1', severity: 'error', message: 'err', targetId: 'b1' },
          { ruleId: 'r2', severity: 'error', message: 'err2', targetId: 'b2' },
        ],
        warnings: [],
      },
      workspace: {
        id: 'ws-1', name: 'Test', architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  // --- Save / Load / Reset ---

  it('saves workspace on click and shows alert', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Toolbar />);
    await user.click(screen.getByTitle('Save Workspace'));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(alertMock).toHaveBeenCalledWith('Workspace saved!');
    alertMock.mockRestore();
  });

  it('loads workspace on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Load Workspace'));
    expect(loadFromStorageMock).toHaveBeenCalledOnce();
  });

  it('resets workspace after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Toolbar />);
    await user.click(screen.getByTitle('Reset Workspace'));
    expect(resetWorkspaceMock).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('does not reset workspace when confirmation cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Toolbar />);
    await user.click(screen.getByTitle('Reset Workspace'));
    expect(resetWorkspaceMock).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // --- Undo / Redo ---

  it('disables undo button when canUndo is false', () => {
    render(<Toolbar />);
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undoBtn).toBeDisabled();
  });

  it('enables undo button when canUndo is true', () => {
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: true,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test', architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undoBtn).not.toBeDisabled();
  });

  it('calls undo on click', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: true,
      canRedo: false,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test', architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(undoMock).toHaveBeenCalledOnce();
  });

  it('calls redo on click', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      addPlate: addPlateMock,
      validate: validateMock,
      saveToStorage: saveToStorageMock,
      loadFromStorage: loadFromStorageMock,
      resetWorkspace: resetWorkspaceMock,
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: true,
      importArchitecture: importArchitectureMock,
      validationResult: null,
      workspace: {
        id: 'ws-1', name: 'Test', architecture: emptyArch,
        createdAt: '', updatedAt: '',
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'));
    expect(redoMock).toHaveBeenCalledOnce();
  });

  // --- Export ---

  it('exports architecture as JSON', async () => {
    const user = userEvent.setup();
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
    const clickMock = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickMock } as unknown as HTMLElement;
      }
      return origCreate(tag);
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Export architecture.json'));
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // --- Import ---

  it('triggers file input when import button clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.style.display).toBe('none');
    const clickSpy = vi.spyOn(fileInput, 'click');
    await user.click(screen.getByTitle('Import architecture.json'));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('imports file when selected', async () => {
    render(<Toolbar />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const jsonContent = '{"id":"test","name":"Test"}';
    const file = new File([jsonContent], 'test.json', { type: 'application/json' });

    // Create a mock FileReader class
    let capturedOnload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    const readAsTextMock = vi.fn();
    const OrigFileReader = window.FileReader;
    class MockFileReader {
      result: string | null = null;
      set onload(fn: ((ev: ProgressEvent<FileReader>) => void) | null) {
        capturedOnload = fn;
      }
      get onload() {
        return capturedOnload;
      }
      readAsText = readAsTextMock;
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // Trigger change event
    Object.defineProperty(fileInput, 'files', { value: [file], writable: true, configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Simulate onload
    const onloadFn = capturedOnload as ((ev: ProgressEvent<FileReader>) => void) | null;
    if (onloadFn) {
      onloadFn({ target: { result: jsonContent } } as unknown as ProgressEvent<FileReader>);
    }
    expect(importArchitectureMock).toHaveBeenCalledWith(jsonContent);
    vi.stubGlobal('FileReader', OrigFileReader);
  });

  // --- Panel toggles ---

  it('toggles code preview on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Generate Terraform Code'));
    expect(useUIStore.getState().showCodePreview).toBe(true);
  });

  it('toggles workspace manager on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Manage Workspaces'));
    expect(useUIStore.getState().showWorkspaceManager).toBe(true);
  });

  it('toggles template gallery on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Browse Templates'));
    expect(useUIStore.getState().showTemplateGallery).toBe(true);
  });

  it('toggles block palette on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByText(/Palette/));
    // It was initially true, should toggle to false
    expect(useUIStore.getState().showBlockPalette).toBe(false);
  });

  it('toggles properties panel on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByText(/Props/));
    expect(useUIStore.getState().showProperties).toBe(false);
  });

  it('toggles validation panel on click', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByText(/Results/));
    expect(useUIStore.getState().showValidation).toBe(true);
  });

  it('shows Account label when authenticated but user has no github_username', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: null,
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    expect(screen.getByText('🔐 Account')).toBeInTheDocument();
  });

  it('shows Account label when authenticated but user is null', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: null,
    });
    render(<Toolbar />);
    expect(screen.getByText('🔐 Account')).toBeInTheDocument();
  });

  it('toggles GitHub login when authenticated and account button clicked', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('GitHub Account'));
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('toggles GitHub repos when authenticated', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('GitHub Repos'));
    expect(useUIStore.getState().showGitHubRepos).toBe(true);
  });

  it('toggles GitHub sync when authenticated', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Sync with GitHub'));
    expect(useUIStore.getState().showGitHubSync).toBe(true);
  });

  it('toggles GitHub PR when authenticated', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Create Pull Request'));
    expect(useUIStore.getState().showGitHubPR).toBe(true);
  });

  it('toggles GitHub login when Sign In button clicked', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTitle('Sign in with GitHub'));
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('validates and does not toggle validation if already open', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showValidation: true });
    render(<Toolbar />);
    await user.click(screen.getByTitle('Validate Architecture'));
    expect(validateMock).toHaveBeenCalled();
    expect(useUIStore.getState().showValidation).toBe(true);
  });
});
