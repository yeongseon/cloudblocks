import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore, type ToolMode } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Block, Connection, Plate } from '@cloudblocks/schema';

vi.mock('./CommandCard.css', () => ({}));
vi.mock('../../shared/ui/PromptDialog', () => ({
  promptDialog: vi.fn(),
}));
vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
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

const testConnection: Connection = {
  id: 'conn-1',
  sourceId: 'block-1',
  targetId: 'block-2',
  type: 'dataflow',
  metadata: {},
};

describe('CommandCard', () => {
  const addBlockMock = vi.fn();
  const duplicateBlockMock = vi.fn();
  const renameBlockMock = vi.fn();
  const renamePlateMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const removeConnectionMock = vi.fn();
  const updateBlockConfigMock = vi.fn();
  const updateConnectionTypeMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const setToolModeMock = vi.fn<(mode: ToolMode) => void>();
  const startBuildMock = vi.fn();
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
      removeConnection: removeConnectionMock,
      updateBlockConfig: updateBlockConfigMock,
      updateConnectionType: updateConnectionTypeMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });

    useWorkerStore.setState({
      workerPosition: [2, 0, 3],
      startBuild: startBuildMock,
    });
  });

  // --- Empty Hint ---

  it('renders empty hint when nothing is selected', () => {
    render(<CommandCard />);

    expect(screen.getByText('Command Card')).toBeInTheDocument();
    expect(screen.getByText(/Select a worker, block, plate, or connection/)).toBeInTheDocument();
  });

  // --- Worker Mode ---

  it('shows Worker Actions header when worker is selected', () => {
    useUIStore.setState({ selectedId: 'worker-default' });

    render(<CommandCard />);

    expect(screen.getByText('Worker Actions')).toBeInTheDocument();
    expect(screen.getByTitle('Build (Q)')).toBeInTheDocument();
    expect(screen.getByTitle('Connect (W)')).toBeInTheDocument();
    expect(screen.getByTitle('Move (E) - coming soon')).toBeInTheDocument();
    expect(screen.getByTitle('Relocate (R) - coming soon')).toBeInTheDocument();
  });

  it('navigates to build grid and back', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });

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

    await user.click(screen.getByTitle('Build (Q)'));

    expect(screen.getByRole('button', { name: /Back to worker actions/ })).toBeInTheDocument();
    expect(screen.getByTitle('Build Virtual Machine')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to worker actions/ }));

    expect(screen.getByTitle('Build (Q)')).toBeInTheDocument();
  });

  it('sets connect tool mode when Connect is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });

    render(<CommandCard />);

    await user.click(screen.getByTitle('Connect (W)'));

    expect(setToolModeMock).toHaveBeenCalledWith('connect');
  });

  it('calls startBuild when block is built via worker build grid', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'worker-default' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    addBlockMock.mockImplementation((category: string, name: string, placementId: string) => {
      useArchitectureStore.setState((state) => {
        const newBlock: Block = {
          id: 'worker-built-block',
          name,
          category: category as Block['category'],
          placementId,
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        };
        return {
          workspace: {
            ...state.workspace,
            architecture: {
              ...state.workspace.architecture,
              blocks: [...state.workspace.architecture.blocks, newBlock],
            },
          },
        };
      });
    });

    render(<CommandCard />);

    await user.click(screen.getByTitle('Build (Q)'));
    await user.click(screen.getByTitle('Build Virtual Machine'));

    expect(startBuildMock).toHaveBeenCalledWith('worker-built-block', [1, 0.3, 1]);
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

  // --- Connection Mode ---

  it('shows connection actions with Delete, type dropdown, and Apply', () => {
    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'SQL DB', category: 'database' }],
          connections: [testConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Connection Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
  });

  it('deletes connection and deselects', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'SQL DB', category: 'database' }],
          connections: [testConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('applies connection type change via updateConnectionType', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'SQL DB', category: 'database' }],
          connections: [testConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'http');

    await user.click(screen.getByRole('button', { name: /Apply/ }));

    expect(updateConnectionTypeMock).toHaveBeenCalledWith('conn-1', 'http');
  });

  // --- Header transitions ---

  it('updates header text across none, block, plate, and connection states', () => {
    const { rerender } = render(<CommandCard />);
    expect(screen.getByText('Command Card')).toBeInTheDocument();

    act(() => {
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
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Block Actions')).toBeInTheDocument();

    act(() => {
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
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Plate Actions')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'conn-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            plates: [networkPlate, publicSubnet],
            blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'SQL DB', category: 'database' }],
            connections: [testConnection],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Connection Actions')).toBeInTheDocument();
  });
});
