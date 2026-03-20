import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  getApiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
import { MenuBar } from './MenuBar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Connection, Plate } from '@cloudblocks/schema';
import { apiPost } from '../../shared/api/client';
import { toast } from 'react-hot-toast';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { audioService } from '../../shared/utils/audioService';

const emptyArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const networkPlate: Plate = {
  id: 'net-1',
  name: 'VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 12, height: 0.3, depth: 10 },
  metadata: {},
};

const block: Block = {
  id: 'block-1',
  name: 'Compute',
  category: 'compute',
  placementId: 'subnet-1',
  position: { x: 0, y: 0, z: 0 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'a',
  targetId: 'b',
  type: 'dataflow',
  metadata: {},
};

const removePlateMock = vi.fn();
const removeBlockMock = vi.fn();
const removeConnectionMock = vi.fn();
const validateMock = vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] });
const saveToStorageMock = vi.fn().mockReturnValue(true);
const loadFromStorageMock = vi.fn();
const resetWorkspaceMock = vi.fn();
const undoMock = vi.fn();
const redoMock = vi.fn();
const importArchitectureMock = vi.fn();

function getMenuDropdown(triggerLabel: RegExp | string): HTMLElement {
  const trigger = screen.getByRole('button', { name: triggerLabel });
  const container = trigger.closest('.menu-dropdown-container');
  if (!container) {
    throw new Error('Expected menu dropdown container to exist');
  }

  const dropdown = container.querySelector('.menu-dropdown');
  if (!(dropdown instanceof HTMLElement)) {
    throw new Error('Expected menu dropdown element to exist');
  }

  return dropdown;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, label: string): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: label }));
  return getMenuDropdown(label);
}

function setArchitectureState(overrides?: Partial<ArchitectureModel>): void {
  useArchitectureStore.setState({
    removePlate: removePlateMock,
    removeBlock: removeBlockMock,
    removeConnection: removeConnectionMock,
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
      id: 'ws-1',
      backendWorkspaceId: 'backend-ws-1',
      name: 'Test',
      architecture: { ...emptyArch, ...overrides },
      createdAt: '',
      updatedAt: '',
    },
  });
}

describe('MenuBar', () => {
  const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

  it('renders provider toggle with Azure, AWS, and GCP tabs', () => {
    render(<MenuBar />);
    
    const tablist = screen.getByRole('tablist', { name: /cloud provider/i });
    expect(tablist).toBeInTheDocument();
    
    expect(screen.getByRole('tab', { name: /azure/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aws/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gcp/i })).toBeInTheDocument();
  });

  it('clicking provider tab switches active provider', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ activeProvider: 'aws' });
    render(<MenuBar />);
    
    const azureTab = screen.getByRole('tab', { name: /azure/i });
    await user.click(azureTab);
    
    expect(useUIStore.getState().activeProvider).toBe('azure');
  });

  it('active provider tab shows visual indicator', () => {
    useUIStore.setState({ activeProvider: 'gcp' });
    render(<MenuBar />);
    
    const gcpTab = screen.getByRole('tab', { name: /gcp/i });
    const awsTab = screen.getByRole('tab', { name: /aws/i });
    
    expect(gcpTab).toHaveAttribute('aria-selected', 'true');
    expect(awsTab).toHaveAttribute('aria-selected', 'false');
    
    expect(gcpTab).toHaveStyle('color: #4285F4');
  });

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      showValidation: false,
      showBlockPalette: true,
      showProperties: true,
      showCodePreview: false,
      showSuggestionsPanel: false,
      showCostPanel: false,
      showWorkspaceManager: false,
      showTemplateGallery: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
      connectionSource: null,
      draggedBlockCategory: null,
      activeProvider: 'azure',
      isSoundMuted: false,
    });

    useAuthStore.setState({
      status: 'anonymous',
      user: null,
      hydrated: true,
      error: null,
    });

    setArchitectureState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders logo, workspace button, all menu triggers, and quick action buttons', () => {
    render(<MenuBar />);

    expect(screen.getByText(/CloudBlocks/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Workspaces' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();


    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Save Workspace (Ctrl+S)')).toBeInTheDocument();
  });

  it('shows Sign In when not authenticated and GitHub username when authenticated', () => {
    const { rerender } = render(<MenuBar />);
    expect(screen.getByRole('button', { name: /Sign In/ })).toBeInTheDocument();

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

    rerender(<MenuBar />);
    expect(screen.getByRole('button', { name: /octocat/ })).toBeInTheDocument();
  });

  it('toggles workspace manager from Workspaces button', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByRole('button', { name: 'Workspaces' }));
    expect(useUIStore.getState().showWorkspaceManager).toBe(true);
  });

  it('opens and closes dropdown with trigger, outside click, and Escape', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const fileTrigger = screen.getByRole('button', { name: 'File' });
    const fileDropdown = getMenuDropdown('File');
    expect(fileDropdown.className).not.toContain('show');

    await user.click(fileTrigger);
    expect(fileDropdown.className).toContain('show');

    await user.click(fileTrigger);
    expect(fileDropdown.className).not.toContain('show');

    await user.click(fileTrigger);
    expect(fileDropdown.className).toContain('show');
    fireEvent.click(document.body);
    expect(fileDropdown.className).not.toContain('show');

    await user.click(fileTrigger);
    expect(fileDropdown.className).toContain('show');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fileDropdown.className).not.toContain('show');
  });

  it('handles File menu save, load, import trigger, export, and reset(confirm=true)', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(true);
    const createObjectURLMock = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<MenuBar />);

    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected hidden file input to be present');
    }
    const fileInputClickSpy = vi.spyOn(fileInput, 'click');

    const fileDropdown = await openMenu(user, 'File');

    await user.click(within(fileDropdown).getByRole('button', { name: /Save Workspace/ }));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Workspace saved!');

    await openMenu(user, 'File');
    await user.click(within(getMenuDropdown('File')).getByRole('button', { name: /Load Workspace/ }));
    await waitFor(() => {
      expect(confirmDialog).toHaveBeenCalledWith(
        'Loading will replace current workspace with saved data. Unsaved changes will be lost.',
        'Load Workspace?',
      );
    });
    expect(loadFromStorageMock).toHaveBeenCalledOnce();

    await openMenu(user, 'File');
    await user.click(within(getMenuDropdown('File')).getByRole('button', { name: /Import JSON/ }));
    expect(fileInputClickSpy).toHaveBeenCalledOnce();

    await openMenu(user, 'File');
    await user.click(within(getMenuDropdown('File')).getByRole('button', { name: /Export JSON/ }));
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(anchorClickMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();

    await openMenu(user, 'File');
    await user.click(within(getMenuDropdown('File')).getByRole('button', { name: /Reset Workspace/ }));
    expect(confirmDialog).toHaveBeenCalledWith('All unsaved changes will be lost.', 'Reset Workspace?');
    await waitFor(() => {
      expect(resetWorkspaceMock).toHaveBeenCalledOnce();
    });
  }, 30000);

  it('does not reset workspace when reset confirmation is false', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    render(<MenuBar />);

    const fileDropdown = await openMenu(user, 'File');
    await user.click(within(fileDropdown).getByRole('button', { name: /Reset Workspace/ }));

    await waitFor(() => {
      expect(resetWorkspaceMock).not.toHaveBeenCalled();
    });
  });

  it('does not load workspace when load confirmation is canceled', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    render(<MenuBar />);

    const fileDropdown = await openMenu(user, 'File');
    await user.click(within(fileDropdown).getByRole('button', { name: /Load Workspace/ }));

    await waitFor(() => {
      expect(loadFromStorageMock).not.toHaveBeenCalled();
    });
  });

  it('imports selected JSON file with FileReader and closes open menu', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await openMenu(user, 'File');
    const fileDropdown = getMenuDropdown('File');
    expect(fileDropdown.className).toContain('show');

    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected hidden file input to be present');
    }

    const jsonContent = '{"id":"test","name":"Test"}';
    const file = new File([jsonContent], 'test.json', { type: 'application/json' });

    let capturedOnload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    const readAsTextMock = vi.fn();
    const originalFileReader = window.FileReader;

    class MockFileReader {
      set onload(handler: ((ev: ProgressEvent<FileReader>) => void) | null) {
        capturedOnload = handler;
      }

      get onload(): ((ev: ProgressEvent<FileReader>) => void) | null {
        return capturedOnload;
      }

      readAsText(fileBlob: Blob): void {
        readAsTextMock(fileBlob);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    const onloadHandler = capturedOnload as ((ev: ProgressEvent<FileReader>) => void) | null;
    if (onloadHandler !== null) {
      onloadHandler({ target: { result: jsonContent } } as unknown as ProgressEvent<FileReader>);
    }

    expect(readAsTextMock).toHaveBeenCalledWith(file);
    expect(importArchitectureMock).toHaveBeenCalledWith(jsonContent);
    expect(fileInput.value).toBe('');
    expect(getMenuDropdown('File').className).not.toContain('show');

    vi.stubGlobal('FileReader', originalFileReader);
  }, 15000);

  it('does nothing when import change event has no file', () => {
    render(<MenuBar />);
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected hidden file input to be present');
    }

    Object.defineProperty(fileInput, 'files', {
      value: [],
      writable: true,
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(importArchitectureMock).not.toHaveBeenCalled();
  });

  it('handles Edit menu undo/redo enabled state and calls actions', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let editDropdown = await openMenu(user, 'Edit');
    let undoItem = within(editDropdown).getByRole('button', { name: /Undo/ });
    let redoItem = within(editDropdown).getByRole('button', { name: /Redo/ });
    expect(undoItem).toBeDisabled();
    expect(redoItem).toBeDisabled();

    useArchitectureStore.setState({ canUndo: true, canRedo: true });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    editDropdown = getMenuDropdown('Edit');
    undoItem = within(editDropdown).getByRole('button', { name: /Undo/ });
    redoItem = within(editDropdown).getByRole('button', { name: /Redo/ });
    expect(undoItem).not.toBeDisabled();
    expect(redoItem).not.toBeDisabled();

    await user.click(undoItem);
    expect(undoMock).toHaveBeenCalledOnce();

    editDropdown = await openMenu(user, 'Edit');
    await user.click(within(editDropdown).getByRole('button', { name: /Redo/ }));
    expect(redoMock).toHaveBeenCalledOnce();
  }, 15000);

  it('deletes selected plate, block, and connection from Edit menu', async () => {
    const user = userEvent.setup();

    setArchitectureState({ plates: [networkPlate], blocks: [block], connections: [connection] });
    useUIStore.setState({ selectedId: 'net-1' });
    render(<MenuBar />);

    let editDropdown = await openMenu(user, 'Edit');
    await user.click(within(editDropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removePlateMock).toHaveBeenCalledWith('net-1');

    useUIStore.setState({ selectedId: 'block-1' });
    editDropdown = await openMenu(user, 'Edit');
    await user.click(within(editDropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removeBlockMock).toHaveBeenCalledWith('block-1');

    useUIStore.setState({ selectedId: 'conn-1' });
    editDropdown = await openMenu(user, 'Edit');
    await user.click(within(editDropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
  }, 15000);

  it('does not delete when selected id is unknown', async () => {
    const user = userEvent.setup();
    setArchitectureState({ plates: [networkPlate], blocks: [block], connections: [connection] });
    useUIStore.setState({ selectedId: 'unknown-id' });
    render(<MenuBar />);

    const editDropdown = await openMenu(user, 'Edit');
    await user.click(within(editDropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removePlateMock).not.toHaveBeenCalled();
    expect(removeBlockMock).not.toHaveBeenCalled();
    expect(removeConnectionMock).not.toHaveBeenCalled();
  });


  it('handles Build menu validate and panel toggles', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    const validateCallsBeforeFirstClick = validateMock.mock.calls.length;

    let buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Validate Architecture/ }));
    expect(validateMock.mock.calls.length).toBeGreaterThan(validateCallsBeforeFirstClick);
    expect(useUIStore.getState().showValidation).toBe(true);

    useUIStore.setState({ showValidation: true });
    const validateCallsBeforeSecondClick = validateMock.mock.calls.length;
    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Validate Architecture/ }));
    expect(validateMock.mock.calls.length).toBeGreaterThan(validateCallsBeforeSecondClick);
    expect(useUIStore.getState().showValidation).toBe(true);

    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Generate Terraform/ }));
    expect(useUIStore.getState().showCodePreview).toBe(true);

    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /AI Suggestions Panel/ }));
    expect(useUIStore.getState().showSuggestionsPanel).toBe(true);
    expect(useUIStore.getState().showCodePreview).toBe(false);

    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /AI Cost Panel/ }));
    expect(useUIStore.getState().showCostPanel).toBe(true);
    expect(useUIStore.getState().showSuggestionsPanel).toBe(false);

    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Browse Templates/ }));
    expect(useUIStore.getState().showTemplateGallery).toBe(true);
    expect(useUIStore.getState().showCostPanel).toBe(false);
  }, 15000);

  it('handles Build menu scenario gallery and learning panel (merged from Learn menu)', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Browse Scenarios/ }));
    expect(useUIStore.getState().showScenarioGallery).toBe(true);

    buildDropdown = await openMenu(user, 'Build');
    await user.click(within(buildDropdown).getByRole('button', { name: /Show Learning Panel/ }));
    expect(useUIStore.getState().showLearningPanel).toBe(true);

    buildDropdown = await openMenu(user, 'Build');
    const learningPanelButton = within(buildDropdown).getByRole('button', { name: /Show Learning Panel/ });
    expect(learningPanelButton.textContent).toContain('\u2713');
  });

  it('handles View menu toggle for validation results', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Validation Results/ }));
    expect(useUIStore.getState().showValidation).toBe(true);
  });

  it('handles View menu toggle for Block Palette', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Block Palette/ }));
    expect(useUIStore.getState().showBlockPalette).toBe(false);
  });

  it('handles View menu toggle for Properties Panel', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Properties Panel/ }));
    expect(useUIStore.getState().showProperties).toBe(false);
  });

  it('disables diff toggle when diff mode is off and turns it off when enabled', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let viewDropdown = await openMenu(user, 'View');
    const diffButtonDisabled = within(viewDropdown).getByRole('button', { name: /Diff View/ });
    expect(diffButtonDisabled).toBeDisabled();

    useUIStore.getState().setDiffMode(true, {
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      summary: { totalChanges: 0, hasBreakingChanges: false },
    }, emptyArch);

    viewDropdown = await openMenu(user, 'View');
    const diffButtonEnabled = within(viewDropdown).getByRole('button', { name: /Diff View/ });
    expect(diffButtonEnabled).not.toBeDisabled();
    await user.click(diffButtonEnabled);
    expect(useUIStore.getState().diffMode).toBe(false);
  });

  it('handles authenticated GitHub menu actions', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn();
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
      logout: logoutMock,
    });

    render(<MenuBar />);

    const githubButton = screen.getByRole('button', { name: /octocat/ });
    await user.click(githubButton);
    let githubDropdown = getMenuDropdown(/octocat/);
    expect(githubDropdown.className).toContain('show');

    await user.click(within(githubDropdown).getByRole('button', { name: /Repos/ }));
    expect(useUIStore.getState().showGitHubRepos).toBe(true);

    await user.click(githubButton);
    githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Sync/ }));
    expect(useUIStore.getState().showGitHubSync).toBe(true);

    await user.click(githubButton);
    githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Create PR/ }));
    expect(useUIStore.getState().showGitHubPR).toBe(true);

    await user.click(githubButton);
    githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Sign Out/ }));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it('compare with GitHub calls backend and enables diff mode', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPost).mockResolvedValue({ architecture: emptyArch });
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

    render(<MenuBar />);

    const githubButton = screen.getByRole('button', { name: /octocat/ });
    await user.click(githubButton);
    const githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }));

    expect(apiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pull');
    expect(useUIStore.getState().diffMode).toBe(true);
  });

  it('compare with GitHub uses backendWorkspaceId when set', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPost).mockResolvedValue({ architecture: emptyArch });
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
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: 'backend-ws-99',
      },
    });

    render(<MenuBar />);

    const githubButton = screen.getByRole('button', { name: /octocat/ });
    await user.click(githubButton);
    const githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }));

    expect(apiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-99/pull');
  });

  it('quick action buttons call undo, redo, and save', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({ canUndo: true, canRedo: true });
    render(<MenuBar />);

    await user.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(undoMock).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'));
    expect(redoMock).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Save Workspace (Ctrl+S)'));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Workspace saved!');
  });

  it('shows "GitHub" fallback when authenticated user has no username', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-2',
        github_username: null,
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });

    render(<MenuBar />);

    const githubBtn = document.querySelector('.github-btn') as HTMLElement;
    expect(githubBtn).toBeInTheDocument();
    expect(githubBtn.textContent).toContain('GitHub');
    expect(screen.queryByRole('button', { name: /Sign In/ })).not.toBeInTheDocument();
  });

  it('toggles sound and updates audio service mute state', async () => {
    const user = userEvent.setup();
    const setMutedSpy = vi.spyOn(audioService, 'setMuted').mockImplementation(() => {});
    render(<MenuBar />);

    const soundButton = screen.getByTitle('Mute Sounds');
    await user.click(soundButton);

    expect(useUIStore.getState().isSoundMuted).toBe(true);
    expect(setMutedSpy).toHaveBeenCalledWith(true);
    setMutedSpy.mockRestore();
  });

  it('shows toast error when compare with GitHub fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPost).mockRejectedValue(new Error('pull failed'));
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

    render(<MenuBar />);
    await user.click(screen.getByRole('button', { name: /octocat/ }));
    const githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }));

    expect(toast.error).toHaveBeenCalledWith('pull failed');
    expect(alertMock).toHaveBeenCalledWith('pull failed');
  });

  it('shows clear error and skips compare call when backendWorkspaceId is missing', async () => {
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
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: undefined,
      },
    });

    render(<MenuBar />);
    await user.click(screen.getByRole('button', { name: /octocat/ }));
    const githubDropdown = getMenuDropdown(/octocat/);
    await user.click(within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }));

    const message = 'Missing backend workspace ID. Open Workspace Manager and connect this workspace to the backend first.';
    expect(apiPost).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(alertMock).toHaveBeenCalledWith(message);
  });

  it('submits AI prompt via AiPromptBar and calls generate', async () => {
    const user = userEvent.setup();
    const generateMock = vi.fn().mockResolvedValue(undefined);
    const { useAiStore } = await import('../../features/ai/store');
    useAiStore.setState({ generate: generateMock, generateLoading: false, generateError: null });
    render(<MenuBar />);

    const promptInput = screen.getByPlaceholderText(/describe your cloud architecture/i);
    await user.type(promptInput, 'Create a 3-tier web app');
    await user.click(screen.getByTitle('Generate Architecture'));

    expect(generateMock).toHaveBeenCalledWith('Create a 3-tier web app', 'azure');
  });

  it('shows validation badge with Valid text when validationResult is valid', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<MenuBar />);

    const buildDropdown = await openMenu(user, 'Build');
    const badge = within(buildDropdown).getByText('Valid');
    expect(badge).toHaveClass('menu-badge-valid');
  });

  it('shows validation badge with Errors text when validationResult is invalid', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      validationResult: { valid: false, errors: [{ ruleId: 'test', message: 'err', severity: 'error', targetId: 'block-1' }], warnings: [] },
    });
    render(<MenuBar />);

    const buildDropdown = await openMenu(user, 'Build');
    const badge = within(buildDropdown).getByText('Errors');
    expect(badge).toHaveClass('menu-badge-invalid');
  });
});
