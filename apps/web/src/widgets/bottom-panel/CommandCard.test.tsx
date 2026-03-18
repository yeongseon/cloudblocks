import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore, type ToolMode } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Plate } from '../../shared/types/index';

vi.mock('./CommandCard.css', () => ({}));

type DragListeners = {
  start?: () => void;
  move?: (event: { target: EventTarget }) => void;
  end?: (event: { target: EventTarget }) => void;
};

const draggableListeners = new WeakMap<HTMLElement, DragListeners>();
const unsetInteractableMock = vi.fn();

vi.mock('interactjs', () => ({
  default: (element: HTMLElement) => ({
    draggable: (options: { listeners: DragListeners }) => {
      draggableListeners.set(element, options.listeners);
      return { unset: unsetInteractableMock };
    },
  }),
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
  type: 'network',
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

const privateSubnet: Plate = {
  id: 'subnet-private-1',
  name: 'Private Subnet',
  type: 'subnet',
  subnetAccess: 'private',
  parentId: 'net-1',
  children: [],
  position: { x: 8, y: 0, z: 1 },
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
  const addPlateMock = vi.fn();
  const addBlockMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const setToolModeMock = vi.fn<(mode: ToolMode) => void>();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
      setToolMode: setToolModeMock,
      toolMode: 'select',
      activeProvider: 'azure',
    });

    useArchitectureStore.setState({
      addPlate: addPlateMock,
      addBlock: addBlockMock,
      removeBlock: removeBlockMock,
      removePlate: removePlateMock,
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

  it('renders creation mode with tabs and 3x3 resource grid', () => {
    const { container } = render(<CommandCard />);

    expect(screen.getByText('Create Resource')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Infra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Messaging' })).toBeInTheDocument();

    expect(container.querySelectorAll('.command-card-row')).toHaveLength(3);
    expect(container.querySelectorAll('.command-card-btn')).toHaveLength(9);
  });

  it('switches between all category tabs', async () => {
    const user = userEvent.setup();
    render(<CommandCard />);

    const tabs = ['Infra', 'Compute', 'Data', 'Edge', 'Messaging'];

    for (const tab of tabs) {
      await user.click(screen.getByRole('button', { name: tab }));
      expect(screen.getByRole('button', { name: tab })).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('creates network plate from creation mode', async () => {
    const user = userEvent.setup();
    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /VNet/i }));

    expect(addPlateMock).toHaveBeenCalledWith('network', 'VNet', null);
  });

  it('creates block resource when network and subnet exist', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Compute' }));
    await user.click(screen.getByTitle('Create Virtual Machine (Q)'));

    expect(addBlockMock).toHaveBeenCalledWith('compute', 'Virtual Machine 1', 'subnet-public-1', 'azure');
  });

  it('shows disabled resources with lock icon before network exists', async () => {
    const user = userEvent.setup();
    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'Compute' }));
    const vmButton = screen.getByTitle('Create a Network first. Virtual Machines need a network to connect to.');

    expect(vmButton).toBeDisabled();
    expect(within(vmButton).getByText('🔒')).toBeInTheDocument();
  });

  it('handles drag lifecycle in creation mode and cleans up interactables', () => {
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

    const { unmount } = render(<CommandCard />);

    const networkButton = screen.getByTitle('Create Network (VNet) (Q)');
    const firewallButton = screen.getByTitle('Create Azure Firewall (A)');

    const networkListeners = draggableListeners.get(networkButton);
    const vmListeners = draggableListeners.get(firewallButton);

    expect(networkListeners).toBeDefined();
    expect(vmListeners).toBeDefined();

    vmListeners?.start?.();
    vmListeners?.move?.({ target: firewallButton });
    expect(firewallButton).toHaveClass('is-dragging');
    expect(useUIStore.getState().draggedBlockCategory).toBe('gateway');
    expect(useUIStore.getState().draggedResourceName).toBe('Azure Firewall');

    vmListeners?.end?.({ target: firewallButton });
    expect(firewallButton).not.toHaveClass('is-dragging');
    expect(useUIStore.getState().draggedBlockCategory).toBeNull();
    expect(useUIStore.getState().draggedResourceName).toBeNull();

    networkListeners?.move?.({ target: networkButton });
    expect(useUIStore.getState().draggedBlockCategory).toBeNull();
    expect(useUIStore.getState().draggedResourceName).toBeNull();

    const detachedButton = document.createElement('button');
    vmListeners?.move?.({ target: detachedButton });
    expect(useUIStore.getState().draggedBlockCategory).toBeNull();

    unmount();
    expect(unsetInteractableMock).toHaveBeenCalled();
  });

  it('creates private subnet from creation mode when network exists', async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByTitle('Create Private Subnet (E)'));

    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Private Subnet', 'net-1', 'private');
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
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Infra' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Link/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete/ }));

    expect(removeBlockMock).toHaveBeenCalledWith('block-1');
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
          plates: [networkPlate, publicSubnet],
          blocks: [computeBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Link/ }));

    expect(setToolModeMock).toHaveBeenCalledWith('connect');
  });

  it('handles non-destructive action buttons without errors', async () => {
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

    await user.click(screen.getByRole('button', { name: /Edit/ }));
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    await user.click(screen.getByRole('button', { name: /Config/ }));
    await user.click(screen.getByRole('button', { name: /Add App/ }));
    await user.click(screen.getByRole('button', { name: /Move/ }));
    await user.click(screen.getByRole('button', { name: /Rename/ }));

    expect(useUIStore.getState().selectedId).toBe('block-1');
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
          plates: [networkPlate],
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
    expect(screen.getByRole('button', { name: /Config/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
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
            plates: [networkPlate, publicSubnet],
            blocks: [computeBlock],
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
            plates: [networkPlate],
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
          plates: [networkPlate, publicSubnet],
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
          plates: [networkPlate],
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
            plates: [networkPlate],
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
    expect(screen.queryByTitle('Create Azure SQL (W)')).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'subnet-public-1' });
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
    });
    rerender(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByTitle('Create DNS Zone (W)')).toBeInTheDocument();
    expect(screen.getByTitle('Create Virtual Machine (S)')).toBeInTheDocument();
    expect(screen.queryByTitle('Create Azure SQL (W)')).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ selectedId: 'subnet-private-1' });
      useArchitectureStore.setState({
        workspace: {
          id: 'ws-1',
          name: 'Test Workspace',
          architecture: {
            ...baseArchitecture,
            plates: [networkPlate, privateSubnet],
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
    rerender(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(screen.getByTitle('Create Azure SQL (W)')).toBeInTheDocument();
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
          plates: [networkPlate, publicSubnet],
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
          plates: [networkPlate, privateSubnet],
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
          plates: [networkPlate],
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
          plates: [networkPlate],
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

    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Public Subnet', 'net-1', 'public');
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
          plates: [networkPlate],
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

  it('handles plate move, rename, config actions without errors', async () => {
    const user = userEvent.setup();

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

    await user.click(screen.getByRole('button', { name: /Move/ }));
    await user.click(screen.getByRole('button', { name: /Rename/ }));
    await user.click(screen.getByRole('button', { name: /Config/ }));

    expect(useUIStore.getState().selectedId).toBe('net-1');
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
          plates: [networkPlate, publicSubnet],
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
    await user.click(screen.getByTitle('Create Virtual Machine (S)'));

    expect(addBlockMock).toHaveBeenCalledWith('compute', 'Virtual Machine 1', 'subnet-public-1', 'azure');
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
          plates: [networkPlate, privateSubnet],
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
    await user.click(screen.getByTitle('Create Azure SQL (W)'));

    expect(addBlockMock).toHaveBeenCalledWith('database', 'Azure SQL 1', 'subnet-private-1', 'azure');
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
          plates: [networkPlate],
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

    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Private Subnet', 'net-1', 'private');
  });
});
