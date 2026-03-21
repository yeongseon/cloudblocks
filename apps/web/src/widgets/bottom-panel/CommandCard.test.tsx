import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore, type ToolMode } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Plate } from '@cloudblocks/schema';

vi.mock('./CommandCard.css', () => ({}));
vi.mock('../../shared/ui/PromptDialog', () => ({
  promptDialog: vi.fn(),
}));
vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));
vi.mock('../../entities/block/BlockSvg', () => ({
  BlockSvg: () => null,
}));
vi.mock('../../entities/block/blockFaceColors', () => ({
  getBlockColor: () => '#888',
  getBlockFaceColors: () => ({ top: '#888', left: '#666', right: '#777' }),
  getBlockStudColors: () => ({ top: '#888', shadow: '#666', ring: '#777' }),
}));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
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
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: Plate = {
  id: 'subnet-public-1',
  name: 'Public Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: [],
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const computeBlock: Block = {
  id: 'block-1',
  name: 'App VM',
  category: 'compute',
  placementId: 'subnet-public-1',
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
};

describe('CommandCard', () => {
  const addBlockMock = vi.fn();
  const duplicateBlockMock = vi.fn();
  const renameBlockMock = vi.fn();
  const renamePlateMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const updateBlockConfigMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const setToolModeMock = vi.fn<(mode: ToolMode) => void>();
  const triggerUpgradeAnimationMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
      setToolMode: setToolModeMock,
      toolMode: 'select',
      activeProvider: 'azure',
      triggerUpgradeAnimation: triggerUpgradeAnimationMock,
    });

    useArchitectureStore.setState({
      addBlock: addBlockMock,
      duplicateBlock: duplicateBlockMock,
      renameBlock: renameBlockMock,
      renamePlate: renamePlateMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
      updateBlockConfig: updateBlockConfigMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  // --- Creation Grid (default mode) ---

  it('renders creation grid with "Command Panel" header when nothing is selected', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Command Panel')).toBeInTheDocument();
    expect(screen.queryByText(/Select a block/)).not.toBeInTheDocument();
  });

  it('shows resource buttons in creation grid when VNet exists', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Command Panel')).toBeInTheDocument();
    const resourceButtons = screen.getAllByRole('button');
    expect(resourceButtons.length).toBeGreaterThan(0);
  });

  it('shows disabled resource buttons when no VNet exists', () => {
    render(<CommandCard />);

    expect(screen.getByText('Command Panel')).toBeInTheDocument();
    const disabledButtons = screen.getAllByRole('button', { name: /Needs:/ });
    expect(disabledButtons.length).toBeGreaterThan(0);
    for (const btn of disabledButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('calls addBlock when enabled resource button is clicked', async () => {
    const user = userEvent.setup();

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    const storageBtn = screen.getByRole('button', { name: 'Storage' });
    await user.click(storageBtn);

    expect(addBlockMock).toHaveBeenCalledWith('storage', expect.stringContaining('Blob Storage'), 'net-1', 'azure');
  });

  // --- Block Mode ---

  it('shows block actions with Rename, Copy, Delete, and form', () => {
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Block Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByText('Tier')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
  });

  it('renames block via promptDialog', async () => {
    const user = userEvent.setup();
    const { promptDialog } = await import('../../shared/ui/PromptDialog');
    const promptMock = vi.mocked(promptDialog).mockResolvedValue('  New Block Name  ');

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(promptMock).toHaveBeenCalledWith('Rename block:', 'Rename', 'App VM');
    expect(renameBlockMock).toHaveBeenCalledWith('block-1', 'New Block Name');
    promptMock.mockRestore();
  });

  it('does not rename block when prompt is cancelled', async () => {
    const user = userEvent.setup();
    const { promptDialog } = await import('../../shared/ui/PromptDialog');
    const promptMock = vi.mocked(promptDialog).mockResolvedValue(null);

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(renameBlockMock).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });

  it('copies block via duplicateBlock', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Copy/ }));

    expect(duplicateBlockMock).toHaveBeenCalledWith('block-1');
  });

  it('deletes block after confirmDialog', async () => {
    const user = userEvent.setup();
    const { confirmDialog } = await import('../../shared/ui/ConfirmDialog');
    vi.mocked(confirmDialog).mockResolvedValue(true);

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeBlockMock).toHaveBeenCalledWith('block-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('does not delete block when confirmDialog is cancelled', async () => {
    const user = userEvent.setup();
    const { confirmDialog } = await import('../../shared/ui/ConfirmDialog');
    vi.mocked(confirmDialog).mockResolvedValue(false);

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeBlockMock).not.toHaveBeenCalled();
  });

  it('applies block config changes and triggers upgrade animation', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Apply/ }));

    expect(updateBlockConfigMock).toHaveBeenCalledWith('block-1', {
      tier: 'Standard',
      scale: 1,
      notes: '',
    });
    expect(triggerUpgradeAnimationMock).toHaveBeenCalledWith('block-1');
  });

  // --- Plate Mode ---

  it('shows plate actions with Rename, Delete, and form', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Plate Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByText('Address Space')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
  });

  it('renames plate via promptDialog', async () => {
    const user = userEvent.setup();
    const { promptDialog } = await import('../../shared/ui/PromptDialog');
    const promptMock = vi.mocked(promptDialog).mockResolvedValue('  Renamed Plate  ');

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(promptMock).toHaveBeenCalledWith('Rename plate:', 'Rename', 'VNet');
    expect(renamePlateMock).toHaveBeenCalledWith('net-1', 'Renamed Plate');
    promptMock.mockRestore();
  });

  it('deletes plate after confirmDialog', async () => {
    const user = userEvent.setup();
    const { confirmDialog } = await import('../../shared/ui/ConfirmDialog');
    vi.mocked(confirmDialog).mockResolvedValue(true);

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removePlateMock).toHaveBeenCalledWith('net-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  // --- Header transitions ---

  it('updates header text across creation grid, block, and plate states', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { rerender } = render(<CommandCard />);
    expect(screen.getByText('Command Panel')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'block-1' });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Block Actions')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'net-1' });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Plate Actions')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: null });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Command Panel')).toBeInTheDocument();
  });
});
