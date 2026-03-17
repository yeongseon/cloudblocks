import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuBar } from './MenuBar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Connection, Plate } from '../../shared/types/index';

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
  type: 'network',
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

const addPlateMock = vi.fn();
const removePlateMock = vi.fn();
const removeBlockMock = vi.fn();
const removeConnectionMock = vi.fn();
const validateMock = vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] });
const saveToStorageMock = vi.fn();
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
    addPlate: addPlateMock,
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
      showBlockPalette: true,
      showProperties: true,
      showCodePreview: false,
      showWorkspaceManager: false,
      showTemplateGallery: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
      connectionSource: null,
      draggedBlockCategory: null,
    });

    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
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
    expect(screen.getByRole('button', { name: 'Insert' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();

    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Save Workspace (Ctrl+S)')).toBeInTheDocument();
  });

  it('shows Sign In when not authenticated and GitHub username when authenticated', () => {
    const { rerender } = render(<MenuBar />);
    expect(screen.getByRole('button', { name: /Sign In/ })).toBeInTheDocument();

    useAuthStore.setState({
      isAuthenticated: true,
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
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
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
    expect(alertMock).toHaveBeenCalledWith('Workspace saved!');

    await openMenu(user, 'File');
    await user.click(within(getMenuDropdown('File')).getByRole('button', { name: /Load Workspace/ }));
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
    expect(confirmMock).toHaveBeenCalledWith('Reset workspace? All unsaved changes will be lost.');
    expect(resetWorkspaceMock).toHaveBeenCalledOnce();
  }, 15000);

  it('does not reset workspace when reset confirmation is false', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<MenuBar />);

    const fileDropdown = await openMenu(user, 'File');
    await user.click(within(fileDropdown).getByRole('button', { name: /Reset Workspace/ }));

    expect(resetWorkspaceMock).not.toHaveBeenCalled();
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
  });

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
  });

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
  });

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

  it('handles Insert menu network and subnet actions', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MenuBar />);

    let insertDropdown = await openMenu(user, 'Insert');
    await user.click(within(insertDropdown).getByRole('button', { name: /Network/ }));
    expect(addPlateMock).toHaveBeenCalledWith('network', 'VNet', null);

    insertDropdown = await openMenu(user, 'Insert');
    await user.click(within(insertDropdown).getByRole('button', { name: /Public Subnet/ }));
    expect(alertMock).toHaveBeenCalledWith('Please create a Network Plate first.');

    insertDropdown = await openMenu(user, 'Insert');
    await user.click(within(insertDropdown).getByRole('button', { name: /Private Subnet/ }));
    expect(alertMock).toHaveBeenCalledWith('Please create a Network Plate first.');

    setArchitectureState({ plates: [networkPlate] });

    insertDropdown = await openMenu(user, 'Insert');
    await user.click(within(insertDropdown).getByRole('button', { name: /Public Subnet/ }));
    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Public Subnet', 'net-1', 'public');

    insertDropdown = await openMenu(user, 'Insert');
    await user.click(within(insertDropdown).getByRole('button', { name: /Private Subnet/ }));
    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Private Subnet', 'net-1', 'private');
  }, 15000);

  it('sets tool mode from Tools menu', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let toolsDropdown = await openMenu(user, 'Tools');
    await user.click(within(toolsDropdown).getByRole('button', { name: /Connect Tool/ }));
    expect(useUIStore.getState().toolMode).toBe('connect');

    toolsDropdown = await openMenu(user, 'Tools');
    await user.click(within(toolsDropdown).getByRole('button', { name: /Delete Tool/ }));
    expect(useUIStore.getState().toolMode).toBe('delete');

    toolsDropdown = await openMenu(user, 'Tools');
    await user.click(within(toolsDropdown).getByRole('button', { name: /Select Tool/ }));
    expect(useUIStore.getState().toolMode).toBe('select');
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
    await user.click(within(buildDropdown).getByRole('button', { name: /Browse Templates/ }));
    expect(useUIStore.getState().showTemplateGallery).toBe(true);
  });

  it('shows validation badge in Build menu when validationResult exists', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({ validationResult: { valid: false, errors: [{ ruleId: 'r1', severity: 'error', message: 'err', targetId: 'x' }], warnings: [] } });

    render(<MenuBar />);
    const buildDropdown = await openMenu(user, 'Build');
    expect(within(buildDropdown).getByText('Errors')).toBeInTheDocument();
  });

  it('handles Learn menu scenario gallery and learning panel toggles', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let learnDropdown = await openMenu(user, 'Learn');
    await user.click(within(learnDropdown).getByRole('button', { name: /Browse Scenarios/ }));
    expect(useUIStore.getState().showScenarioGallery).toBe(true);

    learnDropdown = await openMenu(user, 'Learn');
    await user.click(within(learnDropdown).getByRole('button', { name: /Show Learning Panel/ }));
    expect(useUIStore.getState().showLearningPanel).toBe(true);

    learnDropdown = await openMenu(user, 'Learn');
    const learningPanelButton = within(learnDropdown).getByRole('button', { name: /Show Learning Panel/ });
    expect(learningPanelButton.textContent).toContain('✓');
  });

  it('handles View menu toggles for block palette, properties, and validation', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    let viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Block Palette/ }));
    expect(useUIStore.getState().showBlockPalette).toBe(false);

    viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Properties Panel/ }));
    expect(useUIStore.getState().showProperties).toBe(false);

    viewDropdown = await openMenu(user, 'View');
    await user.click(within(viewDropdown).getByRole('button', { name: /Validation Results/ }));
    expect(useUIStore.getState().showValidation).toBe(true);
  });

  it('handles authenticated GitHub menu actions', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
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
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('quick action buttons call undo, redo, and save', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    useArchitectureStore.setState({ canUndo: true, canRedo: true });
    render(<MenuBar />);

    await user.click(screen.getByTitle('Undo (Ctrl+Z)'));
    expect(undoMock).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Redo (Ctrl+Shift+Z)'));
    expect(redoMock).toHaveBeenCalledOnce();

    await user.click(screen.getByTitle('Save Workspace (Ctrl+S)'));
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(alertMock).toHaveBeenCalledWith('Workspace saved!');
  });
});
