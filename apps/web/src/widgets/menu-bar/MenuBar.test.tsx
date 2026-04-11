import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endpointId } from '@cloudblocks/schema';
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
  getApiErrorMessage: vi.fn((err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    return fallback;
  }),
}));
import { MenuBar } from './MenuBar';
import type { BackendStatus } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useLearningStore } from '../../entities/store/learningStore';
import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  ResourceBlock,
} from '@cloudblocks/schema';
import { apiPost } from '../../shared/api/client';
import { toast } from 'react-hot-toast';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { audioService } from '../../shared/utils/audioService';

const emptyArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  createdAt: '',
  updatedAt: '',
};

const networkPlate: ContainerBlock = {
  id: 'net-1',
  name: 'VNet',
  kind: 'container',
  layer: 'region',
  resourceType: 'virtual_network',
  category: 'network',
  provider: 'azure',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 12, height: 0.3, depth: 10 },
  metadata: {},
};

const block: ResourceBlock = {
  id: 'block-1',
  name: 'Compute',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'subnet-1',
  position: { x: 0, y: 0, z: 0 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  from: endpointId('a', 'output', 'data'),
  to: endpointId('b', 'input', 'data'),
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

function getOverflowDropdown(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Menu' });
  const container = trigger.closest('.menu-dropdown-container');
  if (!container) throw new Error('Expected menu dropdown container to exist');
  const dropdown = container.querySelector('.menu-dropdown');
  if (!(dropdown instanceof HTMLElement)) throw new Error('Expected menu dropdown element');
  return dropdown;
}

async function openOverflow(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  return getOverflowDropdown();
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
      name: 'Test',
      provider: 'azure' as const,
      architecture: { ...emptyArch, ...overrides },
      createdAt: '',
      updatedAt: '',
    },
  });
}

describe('MenuBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      showValidation: false,
      showResourceGuide: true,
      showWorkspaceManager: false,

      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
      backendStatus: 'available',
      connectionSource: null,
      draggedBlockCategory: null,
      activeProvider: 'azure',
      isSoundMuted: false,
      sidebar: { isOpen: true },
      inspector: { isOpen: true, activeTab: 'properties' },
      drawer: { isOpen: false, activePanel: null },
    });

    useAuthStore.setState({
      status: 'anonymous',
      user: null,
      hydrated: true,
      error: null,
    });

    setArchitectureState();
    useLearningStore.setState({
      activeScenario: null,
      progress: null,
      currentHintIndex: -1,
      isCurrentStepComplete: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders compact logo, logo menu trigger, workspace button, and quick actions', () => {
    render(<MenuBar />);

    expect(document.querySelector('.menu-bar-logo svg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Workspaces' })).toBeInTheDocument();

    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Save Workspace (Ctrl+S)')).toBeInTheDocument();
  });

  it('renders core action buttons for Templates and Validate', () => {
    render(<MenuBar />);

    expect(screen.getByTitle('Browse Templates')).toBeInTheDocument();
    expect(screen.getByTitle('Validate Architecture')).toBeInTheDocument();
  });

  it('core action buttons trigger templates and validate', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showValidation: true });
    render(<MenuBar />);

    await user.click(screen.getByRole('button', { name: 'Templates' }));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('templates');

    await user.click(screen.getByRole('button', { name: /Validate architecture/ }));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('validation');
  });

  it('renders provider toggle with Azure, AWS, and GCP tabs', () => {
    render(<MenuBar />);

    const tablist = screen.getByRole('tablist', { name: /cloud provider/i });
    expect(tablist).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /azure/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aws/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gcp/i })).toBeInTheDocument();
  });

  it('clicking provider tab creates new workspace with that provider', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(true);
    useUIStore.setState({ activeProvider: 'aws' });
    render(<MenuBar />);

    const azureTab = screen.getByRole('tab', { name: /azure/i });
    await user.click(azureTab);

    // Provider switch now creates a new workspace and syncs activeProvider
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.stringContaining('AZURE'),
      expect.stringContaining('AZURE'),
    );
    expect(useUIStore.getState().activeProvider).toBe('azure');
  });

  it('AWS and GCP provider tabs are enabled and clickable', () => {
    render(<MenuBar />);

    const awsTab = screen.getByRole('tab', { name: /aws/i });
    const gcpTab = screen.getByRole('tab', { name: /gcp/i });

    expect(awsTab).toBeEnabled();
    expect(gcpTab).toBeEnabled();
  });

  it('does not switch when clicking already active provider tab', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ activeProvider: 'azure' });
    setArchitectureState({ nodes: [{ ...block, provider: 'azure' }] });
    render(<MenuBar />);

    await user.click(screen.getByRole('tab', { name: /azure/i }));

    expect(confirmDialog).not.toHaveBeenCalled();
    expect(useUIStore.getState().activeProvider).toBe('azure');
  });

  it('active provider tab shows visual indicator', () => {
    useUIStore.setState({ activeProvider: 'gcp' });
    render(<MenuBar />);

    const gcpTab = screen.getByRole('tab', { name: /gcp/i });
    const awsTab = screen.getByRole('tab', { name: /aws/i });

    expect(gcpTab).toHaveAttribute('aria-selected', 'true');
    expect(awsTab).toHaveAttribute('aria-selected', 'false');

    expect(gcpTab).toHaveAttribute('data-provider', 'gcp');
    expect(gcpTab).toHaveAttribute('data-active', 'true');
  });

  it('shows Sign In when not authenticated and GitHub username when authenticated', () => {
    const { rerender } = render(<MenuBar />);
    expect(screen.getByRole('button', { name: /Sign in with GitHub/ })).toBeInTheDocument();

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

  it('shows requires-backend state when backend is not available for anonymous users', () => {
    useUIStore.setState({ backendStatus: 'not_configured' });

    render(<MenuBar />);

    const githubButton = screen.getByRole('button', { name: /GitHub: backend required/ });
    expect(githubButton).toBeDisabled();
    expect(githubButton).toHaveAttribute(
      'title',
      'Backend API required for GitHub features. Run the backend server to enable.',
    );
    expect(githubButton.textContent).toContain('API');
  });

  it('keeps loading state when backend status is unknown', () => {
    useUIStore.setState({ backendStatus: 'unknown' });

    render(<MenuBar />);

    expect(screen.getByTitle('Checking authentication...')).toBeDisabled();
  });

  it('toggles workspace manager from Workspaces button', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByRole('button', { name: 'Workspaces' }));
    expect(useUIStore.getState().showWorkspaceManager).toBe(true);
  });

  it('opens and closes overflow dropdown with trigger, outside click, and Escape', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const trigger = screen.getByRole('button', { name: 'Menu' });
    const dropdown = getOverflowDropdown();
    expect(dropdown.className).not.toContain('show');

    await user.click(trigger);
    expect(dropdown.className).toContain('show');

    await user.click(trigger);
    expect(dropdown.className).not.toContain('show');

    await user.click(trigger);
    expect(dropdown.className).toContain('show');
    fireEvent.click(document.body);
    expect(dropdown.className).not.toContain('show');

    await user.click(trigger);
    expect(dropdown.className).toContain('show');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dropdown.className).not.toContain('show');
  });

  it('handles overflow menu save, load, import trigger, export, and reset(confirm=true)', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(true);
    const createObjectURLMock = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickMock = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<MenuBar />);

    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected hidden file input to be present');
    }
    const fileInputClickSpy = vi.spyOn(fileInput, 'click');

    let dropdown = await openOverflow(user);

    await user.click(within(dropdown).getByRole('button', { name: /Save Workspace/ }));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Workspace saved!');

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Load Workspace/ }));
    await waitFor(() => {
      expect(confirmDialog).toHaveBeenCalledWith(
        'Loading will replace current workspace with saved data. Unsaved changes will be lost.',
        'Load Workspace?',
      );
    });
    expect(loadFromStorageMock).toHaveBeenCalledOnce();

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Import JSON/ }));
    expect(fileInputClickSpy).toHaveBeenCalledOnce();

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Export JSON/ }));
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(anchorClickMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledOnce();

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Reset Workspace/ }));
    expect(confirmDialog).toHaveBeenCalledWith(
      'All unsaved changes will be lost.',
      'Reset Workspace?',
    );
    await waitFor(() => {
      expect(resetWorkspaceMock).toHaveBeenCalledOnce();
    });
  }, 30000);

  it('does not reset workspace when reset confirmation is false', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Reset Workspace/ }));

    await waitFor(() => {
      expect(resetWorkspaceMock).not.toHaveBeenCalled();
    });
  });

  it('does not load workspace when load confirmation is canceled', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Load Workspace/ }));

    await waitFor(() => {
      expect(loadFromStorageMock).not.toHaveBeenCalled();
    });
  });

  it('imports selected JSON file with FileReader and closes open menu', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await openOverflow(user);
    const dropdown = getOverflowDropdown();
    expect(dropdown.className).toContain('show');

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
    expect(importArchitectureMock).toHaveBeenCalledWith(jsonContent, 'azure');
    expect(fileInput.value).toBe('');
    expect(getOverflowDropdown().className).not.toContain('show');

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

  it('handles overflow menu undo/redo enabled state and calls actions', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let dropdown = await openOverflow(user);
    let undoItem = within(dropdown).getByRole('button', { name: /Undo/ });
    let redoItem = within(dropdown).getByRole('button', { name: /Redo/ });
    expect(undoItem).toBeDisabled();
    expect(redoItem).toBeDisabled();

    useArchitectureStore.setState({ canUndo: true, canRedo: true });
    // close and reopen
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    dropdown = await openOverflow(user);
    undoItem = within(dropdown).getByRole('button', { name: /Undo/ });
    redoItem = within(dropdown).getByRole('button', { name: /Redo/ });
    expect(undoItem).not.toBeDisabled();
    expect(redoItem).not.toBeDisabled();

    await user.click(undoItem);
    expect(undoMock).toHaveBeenCalledOnce();

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Redo/ }));
    expect(redoMock).toHaveBeenCalledOnce();
  }, 15000);

  it('deletes selected container, block, and connection from overflow menu', async () => {
    const user = userEvent.setup();

    setArchitectureState({ nodes: [networkPlate, block], connections: [connection] });
    useUIStore.setState({ selectedId: 'net-1' });
    render(<MenuBar />);

    let dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removePlateMock).toHaveBeenCalledWith('net-1');

    useUIStore.setState({ selectedId: 'block-1' });
    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removeBlockMock).toHaveBeenCalledWith('block-1');

    useUIStore.setState({ selectedId: 'conn-1' });
    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
  }, 15000);

  it('does not delete when selected id is unknown', async () => {
    const user = userEvent.setup();
    setArchitectureState({ nodes: [networkPlate, block], connections: [connection] });
    useUIStore.setState({ selectedId: 'unknown-id' });
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Delete Selection/ }));
    expect(removePlateMock).not.toHaveBeenCalled();
    expect(removeBlockMock).not.toHaveBeenCalled();
    expect(removeConnectionMock).not.toHaveBeenCalled();
  });

  it('handles overflow menu validate and panel toggles', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);
    const validateCallsBeforeFirstClick = validateMock.mock.calls.length;

    let dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Validate Architecture/ }));
    expect(validateMock.mock.calls.length).toBeGreaterThan(validateCallsBeforeFirstClick);

    const validateCallsBeforeSecondClick = validateMock.mock.calls.length;
    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Validate Architecture/ }));
    expect(validateMock.mock.calls.length).toBeGreaterThan(validateCallsBeforeSecondClick);

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Generate Code/ }));
    expect(useUIStore.getState().drawer.activePanel).toBe('code');

    dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Browse Templates/ }));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('templates');
  }, 15000);

  it('routes Learn button to scenario gallery when no scenario is active', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByTitle('Browse guided scenarios'));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('scenarios');
  });

  it('Learn button opens scenarios drawer when no scenario active and drawer already open', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ drawer: { isOpen: true, activePanel: 'scenarios' } });
    render(<MenuBar />);

    await user.click(screen.getByTitle('Browse guided scenarios'));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('scenarios');
  });

  it('Learn button opens learning panel when an active scenario exists', async () => {
    const user = userEvent.setup();
    useLearningStore.setState({
      activeScenario: {
        id: 'scenario-1',
        name: 'Test Scenario',
        description: 'Scenario for menu test',
        difficulty: 'beginner',
        category: 'general',
        tags: [],
        estimatedMinutes: 5,
        steps: [
          {
            id: 'step-1',
            order: 1,
            title: 'Step 1',
            instruction: 'Do one thing',
            hints: [],
            validationRules: [],
          },
        ],
        initialArchitecture: {
          name: 'Initial',
          version: '1.0.0',
          nodes: [],
          connections: [],
          endpoints: [],
        },
      },
      progress: {
        scenarioId: 'scenario-1',
        currentStepIndex: 0,
        steps: [{ stepId: 'step-1', status: 'active', hintsUsed: 0 }],
        startedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    render(<MenuBar />);

    await user.click(screen.getByTitle('Resume current lesson'));

    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('learning');
  });

  it('handles overflow menu toggle for validation drawer', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showValidation: true });
    render(<MenuBar />);

    await user.click(screen.getByRole('button', { name: /Validate architecture/ }));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('validation');
  });

  it('handles overflow menu toggle for Sidebar', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Sidebar/ }));
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);
  });

  it('Toggle Inspector from overflow menu flips inspector state', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Inspector/ }));
    expect(useUIStore.getState().inspector.isOpen).toBe(false);
  });

  it('handles overflow menu toggle for Resource Guide', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Resource Guide/ }));
    expect(useUIStore.getState().showResourceGuide).toBe(false);
  });

  it('disables diff toggle when diff mode is off and turns it off when enabled', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let dropdown = await openOverflow(user);
    const diffButtonDisabled = within(dropdown).getByRole('button', { name: /Diff View/ });
    expect(diffButtonDisabled).toBeDisabled();

    useUIStore.getState().setDiffMode(
      true,
      {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        rootChanges: [],
        summary: { totalChanges: 0, hasBreakingChanges: false },
      },
      emptyArch,
    );

    dropdown = await openOverflow(user);
    const diffButtonEnabled = within(dropdown).getByRole('button', { name: /Diff View/ });
    expect(diffButtonEnabled).not.toBeDisabled();
    await user.click(diffButtonEnabled);
    expect(useUIStore.getState().diffMode).toBe(false);
  });

  it('handles authenticated GitHub menu actions', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn<() => Promise<BackendStatus>>().mockResolvedValue('available');
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: 'backend-ws-1',
      },
    });
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

    const container = githubButton.closest('.menu-dropdown-container');
    if (!container) throw new Error('Expected GitHub dropdown container');
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;
    expect(githubDropdown.className).toContain('show');

    await user.click(within(githubDropdown).getByRole('button', { name: /Repos/ }));
    expect(useUIStore.getState().showGitHubRepos).toBe(true);

    await user.click(githubButton);
    await user.click(within(githubDropdown).getByRole('button', { name: /Sync/ }));
    expect(useUIStore.getState().showGitHubSync).toBe(true);

    await user.click(githubButton);
    await user.click(within(githubDropdown).getByRole('button', { name: /Create PR/ }));
    expect(useUIStore.getState().showGitHubPR).toBe(true);

    await user.click(githubButton);
    await user.click(within(githubDropdown).getByRole('button', { name: /Sign Out/ }));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it('updates backend status when logout falls back with backend failure', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn<() => Promise<BackendStatus>>().mockResolvedValue('unavailable');
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

    const container = githubButton.closest('.menu-dropdown-container');
    if (!container) throw new Error('Expected GitHub dropdown container');
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;

    await user.click(within(githubDropdown).getByRole('button', { name: /Sign Out/ }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledOnce();
      expect(useUIStore.getState().backendStatus).toBe('unavailable');
    });
  });

  it('disables GitHub sync/pr/compare actions without backend workspace link', async () => {
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

    render(<MenuBar />);

    const githubButton = screen.getByRole('button', { name: /octocat/ });
    await user.click(githubButton);
    const container = githubButton.closest('.menu-dropdown-container') as HTMLElement;
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;

    expect(within(githubDropdown).getByRole('button', { name: /Sync/ })).toBeDisabled();
    expect(within(githubDropdown).getByRole('button', { name: /Create PR/ })).toBeDisabled();
    expect(
      within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }),
    ).toBeDisabled();
  });

  it('compare with GitHub calls backend and enables diff mode', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPost).mockResolvedValue({ architecture: emptyArch });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: 'backend-ws-1',
      },
    });
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
    const container = githubButton.closest('.menu-dropdown-container') as HTMLElement;
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;
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
    const container = githubButton.closest('.menu-dropdown-container') as HTMLElement;
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;
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

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    saveToStorageMock.mockReturnValueOnce(false);
    render(<MenuBar />);

    await user.click(screen.getByTitle('Save Workspace (Ctrl+S)'));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith('Failed to save workspace. Storage may be full.');
  });

  it('shows GitHub icon fallback when authenticated user has no username', () => {
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
    expect(githubBtn).toHaveAttribute('title', 'GitHub');
    expect(githubBtn).toHaveAttribute('aria-label', 'GitHub account');
    expect(screen.queryByRole('button', { name: /Sign in with GitHub/ })).not.toBeInTheDocument();
  });

  it('toggles sound from Advanced menu', async () => {
    const user = userEvent.setup();
    const setMutedSpy = vi.spyOn(audioService, 'setMuted').mockImplementation(() => {});
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Mute Sounds/ }));

    expect(useUIStore.getState().isSoundMuted).toBe(true);
    expect(setMutedSpy).toHaveBeenCalledWith(true);
    setMutedSpy.mockRestore();
  });

  it('shows toast error when compare with GitHub fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPost).mockRejectedValue(new Error('pull failed'));
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: 'backend-ws-1',
      },
    });
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
    const container = githubButton.closest('.menu-dropdown-container') as HTMLElement;
    const githubDropdown = container.querySelector('.menu-dropdown') as HTMLElement;
    await user.click(within(githubDropdown).getByRole('button', { name: /Compare with GitHub/ }));

    expect(toast.error).toHaveBeenCalledWith('pull failed');
  });

  it('Promote to Production button toggles promote dialog', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Promote to Production/ }));

    const { usePromoteStore } = await import('../../entities/store/promoteStore');
    expect(usePromoteStore.getState().showPromoteDialog).toBe(true);
  });

  it('Rollback Production button toggles rollback dialog', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Rollback Production/ }));

    const { usePromoteStore } = await import('../../entities/store/promoteStore');
    expect(usePromoteStore.getState().showRollbackDialog).toBe(true);
  });

  it('Promotion History button toggles history panel', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Promotion History/ }));

    const { usePromoteStore } = await import('../../entities/store/promoteStore');
    expect(usePromoteStore.getState().showPromoteHistory).toBe(true);
  });

  it('Learn button toggles off learning panel when already shown', async () => {
    useUIStore.setState({ drawer: { isOpen: true, activePanel: 'learning' } });
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByTitle('Close learning panel'));

    expect(useUIStore.getState().drawer.isOpen).toBe(false);
  });

  it('diff mode toggle disables diff mode', async () => {
    useUIStore.setState({ diffMode: true });
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow(user);
    await user.click(within(dropdown).getByRole('button', { name: /Diff/ }));

    expect(useUIStore.getState().diffMode).toBe(false);
  });

  it('theme toggle button switches between blueprint and workshop from Advanced menu', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ themeVariant: 'workshop' });
    render(<MenuBar />);

    let dropdown = await openOverflow(user);
    const themeBtn = within(dropdown).getByRole('button', { name: /Switch to Blueprint \(Dark\)/ });
    await user.click(themeBtn);
    expect(useUIStore.getState().themeVariant).toBe('blueprint');

    dropdown = await openOverflow(user);
    const themeBtnDark = within(dropdown).getByRole('button', {
      name: /Switch to Workshop \(Light\)/,
    });
    await user.click(themeBtnDark);
    expect(useUIStore.getState().themeVariant).toBe('workshop');
  });

  it('shows validation badge on Validate button when validation has errors', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: false,
        errors: [{ ruleId: 'r1', message: 'err', severity: 'error', targetId: 'block-1' }],
        warnings: [],
      },
    });
    render(<MenuBar />);

    const validationBtn = screen.getByTitle('Validate Architecture');
    const badge = validationBtn.querySelector('.panel-btn-badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('1');
    expect(validationBtn).toHaveAttribute('aria-label', 'Validate architecture (1 error)');
  });

  it('shows plural error count in badge and aria-label for 2 errors', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: false,
        errors: [
          { ruleId: 'r1', message: 'err 1', severity: 'error', targetId: 'block-1' },
          { ruleId: 'r2', message: 'err 2', severity: 'error', targetId: 'block-2' },
        ],
        warnings: [],
      },
    });
    render(<MenuBar />);

    const validationBtn = screen.getByTitle('Validate Architecture');
    const badge = validationBtn.querySelector('.panel-btn-badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('2');
    expect(validationBtn).toHaveAttribute('aria-label', 'Validate architecture (2 errors)');
  });

  it('does not show validation badge when validation passes', () => {
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<MenuBar />);

    const validationBtn = screen.getByTitle('Validate Architecture');
    const badge = validationBtn.querySelector('.panel-btn-badge');
    expect(badge).not.toBeInTheDocument();
    expect(validationBtn).toHaveAttribute('aria-label', 'Validate architecture');
  });

  it('caps the validation badge at 9+ for more than 9 errors', () => {
    const errors = Array.from({ length: 12 }, (_, i) => ({
      ruleId: `r${i}`,
      message: `err ${i}`,
      severity: 'error' as const,
      targetId: `block-${i}`,
    }));
    useArchitectureStore.setState({
      validationResult: { valid: false, errors, warnings: [] },
    });
    render(<MenuBar />);

    const validationBtn = screen.getByTitle('Validate Architecture');
    const badge = validationBtn.querySelector('.panel-btn-badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe('9+');
    expect(validationBtn).toHaveAttribute('aria-label', 'Validate architecture (9 or more errors)');
  });
});
