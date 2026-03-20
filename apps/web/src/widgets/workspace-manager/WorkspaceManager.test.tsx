import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));
import { WorkspaceManager } from './WorkspaceManager';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { Workspace } from '../../shared/types/index';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';

const makeWorkspace = (id: string, name: string, blocks = 0, plates = 0): Workspace => ({
  id,
  name,
  architecture: {
    id: `arch-${id}`,
    name,
    version: '1.0.0',
    plates: Array.from({ length: plates }, (_, i) => ({
      id: `plate-${id}-${i}`,
      name: `P${i}`,
      type: 'subnet' as const,
      parentId: null,
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 5, height: 0.2, depth: 8 },
      metadata: {},
    })),
    blocks: Array.from({ length: blocks }, (_, i) => ({
      id: `block-${id}-${i}`,
      name: `B${i}`,
      category: 'compute' as const,
      placementId: 'p1',
      position: { x: 0, y: 0, z: 0 },
      metadata: {},
    })),
    connections: [],
    externalActors: [],
    createdAt: '',
    updatedAt: '',
  },
  createdAt: '',
  updatedAt: '',
});

describe('WorkspaceManager', () => {
  const createWorkspaceMock = vi.fn();
  const switchWorkspaceMock = vi.fn();
  const deleteWorkspaceMock = vi.fn();
  const cloneWorkspaceMock = vi.fn();
  const saveToStorageMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showWorkspaceManager: false });
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-1', 'Default Workspace', 2, 1),
      workspaces: [makeWorkspace('ws-1', 'Default Workspace', 2, 1)],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
  });

  it('returns null when showWorkspaceManager is false', () => {
    const { container } = render(<WorkspaceManager />);
    expect(container.innerHTML).toBe('');
  });

  it('renders workspace manager with title when visible', () => {
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    expect(screen.getByText(/Workspaces/)).toBeInTheDocument();
  });

  it('closes when close button clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const closeBtn = screen.getByRole('button', { name: 'Close workspace manager panel' });
    await user.click(closeBtn);
    expect(useUIStore.getState().showWorkspaceManager).toBe(false);
  });

  it('renders current workspace as active', () => {
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    expect(screen.getByText(/Default Workspace/)).toBeInTheDocument();
    expect(screen.getByText(/1 plates · 2 blocks/)).toBeInTheDocument();
  });

  it('renders active indicator (●) for current workspace', () => {
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    expect(screen.getByText(/● Default Workspace/)).toBeInTheDocument();
  });

  it('creates a new workspace', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const input = screen.getByPlaceholderText('New workspace name...');
    await user.type(input, 'My New Workspace');
    await user.click(screen.getByText('+ Create'));
    expect(createWorkspaceMock).toHaveBeenCalledWith('My New Workspace');
  });

  it('creates workspace on Enter key', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const input = screen.getByPlaceholderText('New workspace name...');
    await user.type(input, 'Enter Workspace{Enter}');
    expect(createWorkspaceMock).toHaveBeenCalledWith('Enter Workspace');
  });

  it('does not create workspace with empty name', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    await user.click(screen.getByText('+ Create'));
    expect(createWorkspaceMock).not.toHaveBeenCalled();
  });

  it('disables create button when name input is empty', () => {
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    expect(screen.getByRole('button', { name: '+ Create' })).toBeDisabled();
  });

  it('does not create workspace with whitespace-only name', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const input = screen.getByPlaceholderText('New workspace name...');
    await user.type(input, '   ');
    await user.click(screen.getByText('+ Create'));
    expect(createWorkspaceMock).not.toHaveBeenCalled();
  });

  it('clears input after creating workspace', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const input = screen.getByPlaceholderText('New workspace name...');
    await user.type(input, 'Test');
    await user.click(screen.getByText('+ Create'));
    expect(input).toHaveValue('');
  });

  it('shows switch button for non-active workspaces', () => {
    const ws2 = makeWorkspace('ws-2', 'Second Workspace', 1, 0);
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-1', 'Default Workspace', 2, 1),
      workspaces: [
        makeWorkspace('ws-1', 'Default Workspace', 2, 1),
        ws2,
      ],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    // Switch button (↗) should exist for ws-2
    const switchBtns = screen.getAllByTitle('Switch to this workspace');
    expect(switchBtns).toHaveLength(1);
  });

  it('switches workspace on click', async () => {
    const user = userEvent.setup();
    const ws2 = makeWorkspace('ws-2', 'Second Workspace');
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-1', 'Default Workspace'),
      workspaces: [
        makeWorkspace('ws-1', 'Default Workspace'),
        ws2,
      ],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const switchBtn = screen.getByTitle('Switch to this workspace');
    await user.click(switchBtn);
    expect(saveToStorageMock).toHaveBeenCalledOnce();
    expect(switchWorkspaceMock).toHaveBeenCalledWith('ws-2');
  });

  it('clones workspace on click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const cloneBtn = screen.getByTitle('Clone workspace');
    await user.click(cloneBtn);
    expect(cloneWorkspaceMock).toHaveBeenCalledWith('ws-1');
  });

  it('disables delete button when only one workspace exists', () => {
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const deleteBtn = screen.getByTitle('Delete workspace');
    expect(deleteBtn).toBeDisabled();
  });

  it('deletes workspace after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(true);
    const ws2 = makeWorkspace('ws-2', 'Second');
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-1', 'Default'),
      workspaces: [makeWorkspace('ws-1', 'Default'), ws2],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const deleteBtns = screen.getAllByTitle('Delete workspace');
    // Click delete on the second workspace
    await user.click(deleteBtns[1]);
    expect(confirmDialog).toHaveBeenCalledWith('This cannot be undone.', 'Delete this workspace?');
    await waitFor(() => {
      expect(deleteWorkspaceMock).toHaveBeenCalledWith('ws-2');
    });
  });

  it('does not delete workspace when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(confirmDialog).mockResolvedValue(false);
    const ws2 = makeWorkspace('ws-2', 'Second');
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-1', 'Default'),
      workspaces: [makeWorkspace('ws-1', 'Default'), ws2],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    const deleteBtns = screen.getAllByTitle('Delete workspace');
    await user.click(deleteBtns[1]);
    await waitFor(() => {
      expect(deleteWorkspaceMock).not.toHaveBeenCalled();
    });
  });

  it('includes current workspace in list even if not in workspaces array', () => {
    useArchitectureStore.setState({
      workspace: makeWorkspace('ws-new', 'New Workspace'),
      workspaces: [],
      createWorkspace: createWorkspaceMock,
      switchWorkspace: switchWorkspaceMock,
      deleteWorkspace: deleteWorkspaceMock,
      cloneWorkspace: cloneWorkspaceMock,
      saveToStorage: saveToStorageMock,
    });
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);
    expect(screen.getByText(/New Workspace/)).toBeInTheDocument();
  });

  it('resets draft input on remount (simulating panel close and reopen)', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showWorkspaceManager: true });
    const { unmount } = render(<WorkspaceManager />);

    const input = screen.getByPlaceholderText('New workspace name...');
    await user.type(input, 'Draft workspace');
    expect(input).toHaveValue('Draft workspace');

    unmount();
    useUIStore.setState({ showWorkspaceManager: true });
    render(<WorkspaceManager />);

    expect(screen.getByPlaceholderText('New workspace name...')).toHaveValue('');
  });
});
