import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceBar } from './ResourceBar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Connection, Plate } from '@cloudblocks/schema';

const createArchitecture = (
  plates: Plate[] = [],
  blocks: Block[] = [],
  connections: Connection[] = []
): ArchitectureModel => ({
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  plates,
  blocks,
  connections,
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

  it('renders plate, block, and connection counts for populated architecture', () => {
    const plates: Plate[] = [
      {
        id: 'plate-1',
        name: 'VNet',
        type: 'region',
        parentId: null,
        children: [],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 10, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-2',
        name: 'Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-1',
        children: [],
        position: { x: 1, y: 0, z: 1 },
        size: { width: 6, height: 0.3, depth: 6 },
        metadata: {},
      },
    ];

    const blocks: Block[] = [
      {
        id: 'block-1',
        name: 'VM-1',
        category: 'compute',
        placementId: 'plate-2',
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      },
      {
        id: 'block-2',
        name: 'DB-1',
        category: 'database',
        placementId: 'plate-2',
        position: { x: 2, y: 0, z: 2 },
        metadata: {},
      },
      {
        id: 'block-3',
        name: 'Storage-1',
        category: 'storage',
        placementId: 'plate-2',
        position: { x: 4, y: 0, z: 1 },
        metadata: {},
      },
    ];

    const connections: Connection[] = [
      {
        id: 'conn-1',
        sourceId: 'block-1',
        targetId: 'block-2',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-2',
        sourceId: 'block-2',
        targetId: 'block-3',
        type: 'dataflow',
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
