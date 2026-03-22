import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('./CommandCard.css', () => ({}));
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

const computeBlock: LeafNode = {
  id: 'block-1',
  name: 'App VM',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
};

describe('CommandCard', () => {
  const addNodeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      activeProvider: 'azure',
      sidebar: { isOpen: true, },
      showResourceGuide: true,
    });

    useArchitectureStore.setState({
      addNode: addNodeMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders creation hint when nothing is selected', () => {
    render(<CommandCard />);

    expect(screen.getByText('Create Resource')).toBeInTheDocument();
    expect(screen.getByText('Use the sidebar palette to create and drag resources onto the canvas.')).toBeInTheDocument();
  });

  it('opens sidebar from creation hint when sidebar is closed', async () => {
    const user = userEvent.setup();
    const setSidebarOpen = vi.fn();
    useUIStore.setState({ sidebar: { isOpen: false }, setSidebarOpen });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: /Open Sidebar/ }));
    expect(setSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('shows selected summary for selected block', () => {
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate, computeBlock] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('Selection')).toBeInTheDocument();
    expect(screen.getByText('Selected: App VM')).toBeInTheDocument();
    expect(screen.getByText('See Inspector for details and actions.')).toBeInTheDocument();
  });

  it('enters plate deploy mode from selected plate summary', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    expect(screen.getByText('VNet Selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deploy on Plate' }));

    expect(screen.getByRole('button', { name: 'Back from Deploy on VNet' })).toBeInTheDocument();
    expect(screen.getByTitle('Create Public Subnet (Q)')).toBeInTheDocument();
  });

  it('creates subnet from plate deploy mode', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'Deploy on Plate' }));
    await user.click(screen.getByTitle('Create Public Subnet (Q)'));

    expect(addNodeMock).toHaveBeenCalledWith({
      kind: 'container',
      resourceType: 'subnet',
      name: 'Public Subnet',
      parentId: 'net-1',
      layer: 'subnet',
      access: 'public',
    });
  });

  it('exits deploy mode on Escape', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<CommandCard />);

    await user.click(screen.getByRole('button', { name: 'Deploy on Plate' }));
    expect(screen.getByRole('button', { name: 'Back from Deploy on VNet' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Back from Deploy on VNet' })).not.toBeInTheDocument();
    expect(screen.getByText('VNet Selected')).toBeInTheDocument();
  });
});
