import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore, type ToolMode } from '../../entities/store/uiStore';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';

vi.mock('./CommandCard.css', () => ({}));
vi.mock('../../shared/ui/PromptDialog', () => ({
  promptDialog: vi.fn(),
}));

vi.mock('interactjs', () => {
  const draggable = vi.fn().mockReturnValue({ unset: vi.fn() });
  const interactFn = vi.fn().mockReturnValue({ draggable });
  return { default: interactFn };
});

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  nodes: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const networkPlate: ContainerNode = {
  id: 'net-1',
  name: 'VNet',
  kind: 'container',
  layer: 'region',
  resourceType: 'virtual_network',
  category: 'network',
  provider: 'azure',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: ContainerNode = {
  id: 'subnet-public-1',
  name: 'Public Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  subnetAccess: 'public',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const privateSubnet: ContainerNode = {
  id: 'subnet-private-1',
  name: 'Private Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  subnetAccess: 'private',
  parentId: 'net-1',
  position: { x: 8, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const computeBlock: LeafNode = {
  id: 'block-1',
  name: 'App VM',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'subnet-public-1',
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
};

describe('CommandCard', () => {
  const addNodeMock = vi.fn();
  const duplicateBlockMock = vi.fn();
  const renameBlockMock = vi.fn();
  const renamePlateMock = vi.fn();
  const removeNodeMock = vi.fn();
  const toggleResourceGuideMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const setToolModeMock = vi.fn<(mode: ToolMode) => void>();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
      setToolMode: setToolModeMock,
      toggleResourceGuide: toggleResourceGuideMock,
      showResourceGuide: true,
      toolMode: 'select',
      activeProvider: 'azure',
    });

    useArchitectureStore.setState({
      addNode: addNodeMock,
      duplicateBlock: duplicateBlockMock,
      renameBlock: renameBlockMock,
      renamePlate: renamePlateMock,
      removeNode: removeNodeMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });

  });

  // ─── CreationMode Tests ──────────────────────────────────

  it('renders sidebar palette hint in creation mode', () => {
    render(<CommandCard />);

    expect(screen.getByText('Create Resource')).toBeInTheDocument();
    expect(screen.getByText('Use the sidebar palette to create and drag resources onto the canvas.')).toBeInTheDocument();
  });

  it('shows open sidebar button when sidebar is closed', async () => {
    const user = userEvent.setup();
    const setSidebarOpen = vi.fn();

    useUIStore.setState({ sidebar: { isOpen: false }, setSidebarOpen });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Open Sidebar/ }));

    expect(setSidebarOpen).toHaveBeenCalledWith(true);
  });

  // ─── BlockActionMode Tests ───────────────────────────────

  it('shows block action mode for selected block and executes delete', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Infra' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Link/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guide/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeNodeMock).toHaveBeenCalledWith('block-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('starts link action by setting connect tool mode', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Link/ }));

    expect(setToolModeMock).toHaveBeenCalledWith('connect');
  });

  it('shows only implemented block action buttons', () => {
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByRole('button', { name: /Link/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guide/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Config/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add App/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument();
  });

  it('opens properties panel when guide is clicked and properties are hidden', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useUIStore.setState({ showResourceGuide: false });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Guide/ }));

    expect(toggleResourceGuideMock).toHaveBeenCalledTimes(1);
  });

  it('duplicates selected block when copy is clicked', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Copy/ }));

    expect(duplicateBlockMock).toHaveBeenCalledWith('block-1');
  });

  it('allows inline rename of block name', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input = screen.getByDisplayValue('App VM');
    await user.clear(input);
    await user.type(input, 'New Block Name{Enter}');

    expect(renameBlockMock).toHaveBeenCalledWith('block-1', 'New Block Name');
  });

  it('does not rename block when inline rename is cancelled with Escape', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input = screen.getByDisplayValue('App VM');
    await user.clear(input);
    await user.type(input, 'Cancelled Name{Escape}');

    expect(renameBlockMock).not.toHaveBeenCalled();
  });

  it('does not rename block when inline rename has only whitespace', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input = screen.getByDisplayValue('App VM');
    await user.clear(input);
    await user.type(input, '   {Enter}');

    expect(renameBlockMock).not.toHaveBeenCalled();
  });

  it('does not call toggleResourceGuide when guide is clicked and properties are already shown', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'block-1', showResourceGuide: true });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet, computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Guide/ }));

    expect(toggleResourceGuideMock).not.toHaveBeenCalled();
  });

  // ─── PlateActionMode Tests ──────────────────────────────

  it('shows plate action mode with action buttons when plate is selected', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // Should show PlateActionMode, NOT PlateCreationMode
    expect(screen.getByText('VNet Actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Infra' })).not.toBeInTheDocument();

    // Should have plate action buttons
    expect(screen.getByRole('button', { name: /Deploy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Config/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument();
  });

  it('updates header text across none, block, plate, and deploy states', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<CommandCard />);
    expect(screen.getByText('Create Resource')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'block-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            nodes: [networkPlate, publicSubnet, computeBlock],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('Actions')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'net-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            nodes: [networkPlate],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    expect(screen.getByText('VNet Actions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByRole('button', { name: 'Back from Deploy on VNet' })).toBeInTheDocument();
  });

  it('resets deploy sub-action when selected plate changes', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { rerender } = render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByRole('button', { name: 'Back from Deploy on VNet' })).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'subnet-public-1' });
    });
    rerender(<CommandCard />);

    expect(screen.queryByRole('button', { name: /Back from/ })).not.toBeInTheDocument();
    expect(screen.getByText('Public Subnet Actions')).toBeInTheDocument();
  });

  it('exits deploy mode when Escape is pressed', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByRole('button', { name: 'Back from Deploy on VNet' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: /Back from/ })).not.toBeInTheDocument();
    expect(screen.getByText('VNet Actions')).toBeInTheDocument();
  });

  it('renders different deploy resource sets for network, public subnet, and private subnet', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<CommandCard />);

    act(() => {
      useUIStore.setState({ selectedId: 'net-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            nodes: [networkPlate],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByTitle('Create Public Subnet (Q)')).toBeInTheDocument();
    expect(screen.getByTitle('Create Private Subnet (W)')).toBeInTheDocument();
    expect(screen.queryByTitle('Create SQL Database (W)')).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'subnet-public-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            nodes: [networkPlate, publicSubnet],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByTitle('Create Blob Storage (Q)')).toBeInTheDocument();
    expect(screen.getByTitle('Create Virtual Machine (W)')).toBeInTheDocument();
    expect(screen.getByTitle('Create Key Vault (E)')).toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'subnet-private-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            nodes: [networkPlate, privateSubnet],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByTitle('Create SQL Database (W)')).toBeInTheDocument();
    expect(screen.queryByTitle('Create Public Subnet (Q)')).not.toBeInTheDocument();
  });

  it('shows "Public Subnet Actions" header for selected public subnet', () => {
    useUIStore.setState({ selectedId: 'subnet-public-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Public Subnet Actions')).toBeInTheDocument();
  });

  it('shows "Private Subnet Actions" header for selected private subnet', () => {
    useUIStore.setState({ selectedId: 'subnet-private-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, privateSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Private Subnet Actions')).toBeInTheDocument();
  });

  it('transitions from PlateActionMode to PlateCreationMode via Deploy button', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // Initially in PlateActionMode
    expect(screen.getByText('VNet Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy/ })).toBeInTheDocument();

    // Click Deploy to enter PlateCreationMode
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // Now in PlateCreationMode — should show back navigation and creation resources
    expect(screen.getByRole('button', { name: /Back from/ })).toBeInTheDocument();
    expect(screen.queryByText('VNet Actions')).not.toBeInTheDocument();
  });

  it('creates subnet from PlateCreationMode after Deploy action on network plate', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // Click Deploy to enter creation sub-menu
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // Now in PlateCreationMode — create a public subnet
    await user.click(screen.getByTitle('Create Public Subnet (Q)'));

    expect(addNodeMock).toHaveBeenCalledWith({ kind: 'container', resourceType: 'subnet', name: 'Public Subnet', parentId: 'net-1', layer: 'subnet', access: 'public' });
  });

  it('returns from PlateCreationMode to PlateActionMode via back button', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // Enter PlateCreationMode
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByRole('button', { name: /Back from/ })).toBeInTheDocument();

    // Click back button
    await user.click(screen.getByRole('button', { name: /Back from/ }));

    // Should be back in PlateActionMode
    expect(screen.getByText('VNet Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy/ })).toBeInTheDocument();
  });

  it('deletes plate from PlateActionMode', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeNodeMock).toHaveBeenCalledWith('net-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('renames selected plate when rename is clicked and prompt has value', async () => {
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
          nodes: [networkPlate],
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

  it('does not rename plate when prompt is cancelled (returns null)', async () => {
    const user = userEvent.setup();
    const { promptDialog } = await import('../../shared/ui/PromptDialog');
    const promptMock = vi.mocked(promptDialog).mockResolvedValue(null);

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(promptMock).toHaveBeenCalledWith('Rename plate:', 'Rename', 'VNet');
    expect(renamePlateMock).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });

  it('does not rename plate when prompt returns only whitespace', async () => {
    const user = userEvent.setup();
    const { promptDialog } = await import('../../shared/ui/PromptDialog');
    const promptMock = vi.mocked(promptDialog).mockResolvedValue('   ');

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(promptMock).toHaveBeenCalledWith('Rename plate:', 'Rename', 'VNet');
    expect(renamePlateMock).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });

  it('transitions to PlateCreationMode for public subnet deploy and creates VM', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'subnet-public-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // First see PlateActionMode
    expect(screen.getByText('Public Subnet Actions')).toBeInTheDocument();

    // Click Deploy
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // Now in PlateCreationMode — create a VM
    await user.click(screen.getByTitle('Create Virtual Machine (W)'));

    expect(addNodeMock).toHaveBeenCalledWith({ kind: 'resource', resourceType: 'virtual_machine', name: 'Virtual Machine 1', parentId: 'subnet-public-1', provider: 'azure', subtype: 'virtual_machine' });
  });

  it('transitions to PlateCreationMode for private subnet deploy and creates SQL', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'subnet-private-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, privateSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // First see PlateActionMode
    expect(screen.getByText('Private Subnet Actions')).toBeInTheDocument();

    // Click Deploy
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // Now in PlateCreationMode — create SQL
    await user.click(screen.getByTitle('Create SQL Database (W)'));

    expect(addNodeMock).toHaveBeenCalledWith({ kind: 'resource', resourceType: 'sql_database', name: 'SQL Database 1', parentId: 'subnet-private-1', provider: 'azure', subtype: 'sql_database' });
  });

  it('creates private subnet via Deploy on network plate', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    // Click Deploy to enter creation sub-menu
    await user.click(screen.getByRole('button', { name: /Deploy/ }));

    // Create Private Subnet
    await user.click(screen.getByTitle('Create Private Subnet (W)'));

    expect(addNodeMock).toHaveBeenCalledWith({ kind: 'container', resourceType: 'subnet', name: 'Private Subnet', parentId: 'net-1', layer: 'subnet', access: 'private' });
  });
});
