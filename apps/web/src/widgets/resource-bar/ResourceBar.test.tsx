import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceBar } from './ResourceBar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  ResourceBlock,
} from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';

const createArchitecture = (
  plates: ContainerBlock[] = [],
  blocks: ResourceBlock[] = [],
  connections: Connection[] = [],
): ArchitectureModel => ({
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  nodes: [...plates, ...blocks],
  connections,
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
});

describe('ResourceBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: createArchitecture(),
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders zero counts for empty architecture', () => {
    render(<ResourceBar />);

    const counts = screen.getAllByText('0');
    expect(counts).toHaveLength(3);
  });

  it('renders container, block, and connection counts for populated architecture', () => {
    const plates: ContainerBlock[] = [
      {
        id: 'container-1',
        name: 'VNet',
        kind: 'container',
        layer: 'region',
        resourceType: 'virtual_network',
        category: 'network',
        provider: 'azure',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        frame: { width: 10, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'container-2',
        name: 'Subnet',
        kind: 'container',
        layer: 'subnet',
        resourceType: 'subnet',
        category: 'network',
        provider: 'azure',
        parentId: 'container-1',
        position: { x: 1, y: 0, z: 1 },
        frame: { width: 6, height: 0.3, depth: 6 },
        metadata: {},
      },
    ];

    const blocks: ResourceBlock[] = [
      {
        id: 'block-1',
        name: 'VM-1',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'web_compute',
        category: 'compute',
        provider: 'azure',
        parentId: 'container-2',
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
      {
        id: 'block-2',
        name: 'DB-1',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'relational_database',
        category: 'data',
        provider: 'azure',
        parentId: 'container-2',
        position: { x: 2, y: 0, z: 2 },
        metadata: {},
      },
      {
        id: 'block-3',
        name: 'Storage-1',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'relational_database',
        category: 'data',
        provider: 'azure',
        parentId: 'container-2',
        position: { x: 4, y: 0, z: 1 },
        metadata: {},
      },
    ];

    const connections: Connection[] = [
      {
        id: 'conn-1',
        from: endpointId('block-1', 'output', 'data'),
        to: endpointId('block-2', 'input', 'data'),
        metadata: {},
      },
      {
        id: 'conn-2',
        from: endpointId('block-2', 'output', 'data'),
        to: endpointId('block-3', 'input', 'data'),
        metadata: {},
      },
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: createArchitecture(plates, blocks, connections),
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<ResourceBar />);

    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getAllByText('3')).toHaveLength(1);
  });

  it('keeps counts non-interactive', async () => {
    const user = userEvent.setup();
    render(<ResourceBar />);

    await user.click(screen.getAllByText('0')[0]);
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  it('renders nothing when block palette is hidden', () => {
    useUIStore.setState({ showBlockPalette: false });
    const { container } = render(<ResourceBar />);

    expect(container.querySelector('.resource-bar')).toBeNull();
  });
});
