import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Plate } from '@cloudblocks/schema';

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

describe('CommandCard', () => {
  const addPlateMock = vi.fn();
  const addBlockMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const startBuildMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
      toolMode: 'select',
      activeProvider: 'azure',
    });

    useArchitectureStore.setState({
      addPlate: addPlateMock,
      addBlock: addBlockMock,
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

  // ─── CreationMode Tests ──────────────────────────────────

  it('renders creation mode with category-grouped resources', () => {
    const { container } = render(<CommandCard />);

    expect(screen.getByText('Create Resource')).toBeInTheDocument();

    expect(container.querySelectorAll('.command-card-category-group').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.command-card-resource-btn').length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText('Network Foundations')).toBeInTheDocument();
  });


  it('creates network plate from creation mode', async () => {
    const user = userEvent.setup();
    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /VNet/i }));

    expect(addPlateMock).toHaveBeenCalledWith('region', 'VNet', null);
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

    await user.click(screen.getByTitle('Create Virtual Machine'));

    expect(addBlockMock).toHaveBeenCalledWith('compute', 'Virtual Machine 1', 'subnet-public-1', 'azure', 'vm');
  });

  it('shows disabled resources with lock icon before network exists', () => {
    render(<CommandCard />);

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

    const networkButton = screen.getByTitle('Create Network (VNet)');
    const firewallButton = screen.getByTitle('Create Azure Firewall');

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

    await user.click(screen.getByTitle('Create Private Subnet'));

    expect(addPlateMock).toHaveBeenCalledWith('subnet', 'Private Subnet', 'net-1', 'private');
  });

  // ─── WorkerBuildMode Tests ─────────────────────────────────

  it('shows Build Order header when worker-default is selected', () => {
    useUIStore.setState({ selectedId: 'worker-default' });

    render(<CommandCard />);

    expect(screen.getByText('Build Order')).toBeInTheDocument();
  });

  it('shows worker build grid in worker mode', () => {

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

    const { container } = render(<CommandCard />);


    expect(container.querySelectorAll('.command-card-category-group').length).toBeGreaterThan(0);
    expect(screen.getByTitle('Build Virtual Machine')).toBeInTheDocument();
  });

  it('calls startBuild when block is clicked in worker mode', async () => {
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

    addBlockMock.mockImplementation((category, name, placementId) => {
      useArchitectureStore.setState((state) => ({
        workspace: {
          ...state.workspace,
          architecture: {
            ...state.workspace.architecture,
            blocks: [
              ...state.workspace.architecture.blocks,
              {
                id: 'worker-built-block',
                name,
                category,
                placementId,
                position: { x: 0, y: 0, z: 0 },
                metadata: {},
              },
            ],
          },
        },
      }));
    });

    render(<CommandCard />);

    await user.click(screen.getByTitle('Build Virtual Machine'));

    expect(startBuildMock).toHaveBeenCalledWith('worker-built-block', [1, 0.3, 1]);
  });
});
