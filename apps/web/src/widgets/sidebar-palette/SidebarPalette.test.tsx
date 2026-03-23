import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerNode } from '@cloudblocks/schema';
import { SidebarPalette } from './SidebarPalette';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('./SidebarPalette.css', () => ({}));

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
  endpoints: [],
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
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

describe('SidebarPalette', () => {
  const addNodeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      activeProvider: 'azure',
      isSoundMuted: true,
      sidebar: { isOpen: true },
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

  it('renders category groups', () => {
    render(<SidebarPalette />);

    expect(screen.getByText('Network Foundations')).toBeInTheDocument();
    expect(screen.getByText('Compute Instance')).toBeInTheDocument();
    expect(screen.getByText('Data Store')).toBeInTheDocument();
    expect(screen.getByText('Security Service')).toBeInTheDocument();
  });

  it('filters resources by search query', async () => {
    const user = userEvent.setup();
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

    render(<SidebarPalette />);

    await user.type(screen.getByPlaceholderText('Search resources'), 'vault');

    expect(screen.getByText('KeyVault')).toBeInTheDocument();
    expect(screen.queryByText('VM')).not.toBeInTheDocument();
  });

  it('collapses and expands category sections', async () => {
    const user = userEvent.setup();
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

    render(<SidebarPalette />);

    const toggle = screen.getByRole('button', { name: 'Collapse Network Foundations' });
    expect(screen.getByTitle('Create Network (VNet)')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByTitle('Create Network (VNet)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand Network Foundations' }));
    expect(screen.getByTitle('Create Network (VNet)')).toBeInTheDocument();
  });

  it('shows disabled resources with lock when network is missing', () => {
    render(<SidebarPalette />);

    const vmButton = screen.getByTitle(
      'Create a Network first. Virtual Machines need a network to connect to.',
    );
    expect(vmButton).toBeDisabled();
    expect(within(vmButton).getByText('🔒')).toBeInTheDocument();
  });

  it('creates a resource on click when target plate exists', async () => {
    const user = userEvent.setup();
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

    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Create Virtual Machine'));

    expect(addNodeMock).toHaveBeenCalledWith({
      kind: 'resource',
      resourceType: 'virtual_machine',
      name: 'Virtual Machine 1',
      parentId: 'subnet-public-1',
      provider: 'azure',
      subtype: 'virtual_machine',
    });
  });
});
